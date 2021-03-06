/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { combineLatest, Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
  RequestHandlerContext,
} from 'src/core/server';
import { FleetStartContract } from '../../fleet/server';
import { NewPackagePolicy, UpdatePackagePolicy} from '../../fleet/common/types/models';
import { APMConfig, APMXPackConfig } from '.';
import { mergeConfigs } from './index';
import { APMOSSPluginSetup } from '../../../../src/plugins/apm_oss/server';
import { HomeServerPluginSetup } from '../../../../src/plugins/home/server';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';
import { UI_SETTINGS } from '../../../../src/plugins/data/common';
import { ActionsPlugin } from '../../actions/server';
import { AlertingPlugin } from '../../alerts/server';
import { CloudSetup } from '../../cloud/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { MlPluginSetup } from '../../ml/server';
import { ObservabilityPluginSetup } from '../../observability/server';
import { SecurityPluginSetup } from '../../security/server';
import { ApiKey } from '../../security/common/model';
import { TaskManagerSetupContract } from '../../task_manager/server';
import { APM_FEATURE, registerFeaturesUsage } from './feature';
import { registerApmAlerts } from './lib/alerts/register_apm_alerts';
import { createApmTelemetry } from './lib/apm_telemetry';
import { createApmEventClient } from './lib/helpers/create_es_client/create_apm_event_client';
import { getInternalSavedObjectsClient } from './lib/helpers/get_internal_saved_objects_client';
import { createApmAgentConfigurationIndex } from './lib/settings/agent_configuration/create_agent_config_index';
import { getApmIndices } from './lib/settings/apm_indices/get_apm_indices';
import { createApmCustomLinkIndex } from './lib/settings/custom_link/create_custom_link_index';
import { createApmApi } from './routes/create_apm_api';
import { apmIndices, apmTelemetry } from './saved_objects';
import { createElasticCloudInstructions } from './tutorial/elastic_cloud';
import { uiSettings } from './ui_settings';
import type { ApmPluginRequestHandlerContext } from './routes/typings';

export interface APMPluginSetup {
  config$: Observable<APMConfig>;
  getApmIndices: () => ReturnType<typeof getApmIndices>;
  createApmEventClient: (params: {
    debug?: boolean;
    request: KibanaRequest;
    context: ApmPluginRequestHandlerContext;
  }) => Promise<ReturnType<typeof createApmEventClient>>;
}

export class APMPlugin implements Plugin<APMPluginSetup> {
  private currentConfig?: APMConfig;
  private logger?: Logger;
  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }

  public setup(
    core: CoreSetup,
    plugins: {
      apmOss: APMOSSPluginSetup;
      home: HomeServerPluginSetup;
      licensing: LicensingPluginSetup;
      cloud?: CloudSetup;
      usageCollection?: UsageCollectionSetup;
      taskManager?: TaskManagerSetupContract;
      alerts?: AlertingPlugin['setup'];
      actions?: ActionsPlugin['setup'];
      observability?: ObservabilityPluginSetup;
      features: FeaturesPluginSetup;
      security?: SecurityPluginSetup;
      ml?: MlPluginSetup;
    }
  ) {
    this.logger = this.initContext.logger.get();
    const config$ = this.initContext.config.create<APMXPackConfig>();
    const mergedConfig$ = combineLatest(plugins.apmOss.config$, config$).pipe(
      map(([apmOssConfig, apmConfig]) => mergeConfigs(apmOssConfig, apmConfig))
    );

    core.savedObjects.registerType(apmIndices);
    core.savedObjects.registerType(apmTelemetry);

    core.uiSettings.register(uiSettings);

    if (plugins.actions && plugins.alerts) {
      registerApmAlerts({
        alerts: plugins.alerts,
        actions: plugins.actions,
        ml: plugins.ml,
        config$: mergedConfig$,
      });
    }

    this.currentConfig = mergeConfigs(
      plugins.apmOss.config,
      this.initContext.config.get<APMXPackConfig>()
    );

    if (
      plugins.taskManager &&
      plugins.usageCollection &&
      this.currentConfig['xpack.apm.telemetryCollectionEnabled']
    ) {
      createApmTelemetry({
        core,
        config$: mergedConfig$,
        usageCollector: plugins.usageCollection,
        taskManager: plugins.taskManager,
        logger: this.logger,
        kibanaVersion: this.initContext.env.packageInfo.version,
      });
    }

    const ossTutorialProvider = plugins.apmOss.getRegisteredTutorialProvider();
    plugins.home.tutorials.unregisterTutorial(ossTutorialProvider);
    plugins.home.tutorials.registerTutorial(() => {
      const ossPart = ossTutorialProvider({});
      if (this.currentConfig!['xpack.apm.ui.enabled'] && ossPart.artifacts) {
        ossPart.artifacts.application = {
          path: '/app/apm',
          label: i18n.translate(
            'xpack.apm.tutorial.specProvider.artifacts.application.label',
            {
              defaultMessage: 'Launch APM',
            }
          ),
        };
      }

      return {
        ...ossPart,
        elasticCloud: createElasticCloudInstructions(plugins.cloud),
      };
    });

    plugins.features.registerKibanaFeature(APM_FEATURE);

    registerFeaturesUsage({ licensingPlugin: plugins.licensing });

    createApmApi().init(core, {
      config$: mergedConfig$,
      logger: this.logger!,
      plugins: {
        observability: plugins.observability,
        security: plugins.security,
        ml: plugins.ml,
      },
    });

    const boundGetApmIndices = async () =>
      getApmIndices({
        savedObjectsClient: await getInternalSavedObjectsClient(core),
        config: await mergedConfig$.pipe(take(1)).toPromise(),
      });

    return {
      config$: mergedConfig$,
      getApmIndices: boundGetApmIndices,
      createApmEventClient: async ({
        request,
        context,
        debug,
      }: {
        debug?: boolean;
        request: KibanaRequest;
        context: ApmPluginRequestHandlerContext;
      }) => {
        const [indices, includeFrozen] = await Promise.all([
          boundGetApmIndices(),
          context.core.uiSettings.client.get(UI_SETTINGS.SEARCH_INCLUDE_FROZEN),
        ]);

        const esClient = context.core.elasticsearch.client.asCurrentUser;

        return createApmEventClient({
          debug: debug ?? false,
          esClient,
          request,
          indices,
          options: {
            includeFrozen,
          },
        });
      },
    };
  }

  public start(
    core: CoreStart,
    plugins: {
      fleet?: FleetStartContract;
      security?: SecurityPluginStart;
    }
  ) {
    if (this.currentConfig == null || this.logger == null) {
      throw new Error('APMPlugin needs to be setup before calling start()');
    }

    // create agent configuration index without blocking start lifecycle
    createApmAgentConfigurationIndex({
      client: core.elasticsearch.client.asInternalUser,
      config: this.currentConfig,
      logger: this.logger,
    });
    // create custom action index without blocking start lifecycle
    createApmCustomLinkIndex({
      client: core.elasticsearch.client.asInternalUser,
      config: this.currentConfig,
      logger: this.logger,
    });

    if (plugins.fleet && plugins.security?.authc && plugins.security.authc.apiKeys.areAPIKeysEnabled()) {
      const updatePackagePolicy = async function (packagePolicy, context, request) {
        const configured = packagePolicy.inputs[0].vars.kibana_api_key.value;
        if (configured) {
          // The policy is already configured with an API key, check that it is valid.
          const apiKeyID = configured.split(':', 2)[0];
          const esClient = context.core.elasticsearch.client;
          const apiResponse = await context.core.elasticsearch.client.asInternalUser.security.getApiKey<{
            api_keys: ApiKey[];
          }>({id: apiKeyID});
          if (apiResponse.body.api_keys && !apiResponse.body.api_keys[0].invalidated) {
            return packagePolicy;
          }
        }

        // The policy is not configured with a valid API key, so create a new one.
        const apiKey = await plugins.security.authc.apiKeys.create(request, {
          name: 'apm_central_config_reader',
          role_descriptors: {
            apm_central_config_reader: {
              applications: [{
                application: 'kibana-.kibana',
                privileges: ['feature_apm.read'],
                resources: ['*']
              }]
            }
          }
        });
        packagePolicy.inputs[0].vars.kibana_api_key.value = `${apiKey.id}:${apiKey.api_key}`
        return packagePolicy;
      };

      // Register Fleet package policy creation and update callbacks,
      // so we can inject an API key into the APM policies.
      plugins.fleet.registerExternalCallback('packagePolicyCreate', async (
          packagePolicy: NewPackagePolicy,
          context: RequestHandlerContext,
          request: KibanaRequest
        ): Promise<NewPackagePolicy> => {
          if (packagePolicy.package?.name !== 'apm') {
            return packagePolicy;
          }
          return await updatePackagePolicy(packagePolicy, context, request);
        }
      );
      plugins.fleet.registerExternalCallback('packagePolicyUpdate', async (
          packagePolicy: UpdatePackagePolicy,
          context: RequestHandlerContext,
          request: KibanaRequest
        ): Promise<UpdatePackagePolicy> => {
          if (packagePolicy.package?.name !== 'apm') {
            return packagePolicy;
          }
          return await updatePackagePolicy(packagePolicy, context, request);
        }
      );
    }
  }

  public stop() {}
}
