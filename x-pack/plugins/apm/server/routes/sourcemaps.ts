/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createStaticIndexPattern } from '../lib/index_pattern/create_static_index_pattern';
import { createRoute } from './create_route';
import { setupRequest } from '../lib/helpers/setup_request';
import { getInternalSavedObjectsClient } from '../lib/helpers/get_internal_saved_objects_client';
import { getApmIndexPatternTitle } from '../lib/index_pattern/get_apm_index_pattern_title';
import { getDynamicIndexPattern } from '../lib/index_pattern/get_dynamic_index_pattern';
import { FleetArtifactsClient } from '../../../fleet/server/services/artifacts';

async function updateFleetPolicies(packagePolicyService, savedObjectsClient, elasticsearchClient, logger) {
  const client = new FleetArtifactsClient(elasticsearchClient.asInternalUser, "apm");
  // TODO(axw) iterate through all pages of artifacts.
  // TODO(axw) only record the minimally required artifact fields in the policies.
  const artifacts = await client.listArtifacts("type:sourcemap");
  const policies = await packagePolicyService.list(savedObjectsClient, {
    // TODO(axw) iterate through all pages. Unlikely to be more than a handful,
    // if even more than one, but better to be on the safe side.
    page: 1,
    perPage: 20,
    kuery: 'ingest-package-policies.package.name:apm'
  });
  for (let item of policies.items) {
    const { id, revision, updated_at, updated_by, ...policy } = item;
    policy.inputs[0].config = {
      sourcemap_artifacts: {
        value: artifacts,
      },
    };
    await packagePolicyService.update(savedObjectsClient, elasticsearchClient, id, policy);
  }
}

export const listSourceMapsRoute = createRoute((core) => ({
  endpoint: 'GET /api/apm/sourcemaps',
  options: {tags: ['access:apm']},
  handler: async ({ context, request }) => {
    // TODO(axw) add query params to support pagination
    const client = new FleetArtifactsClient(context.core.elasticsearch.client.asInternalUser, "apm");
    return client.listArtifacts("type: sourcemap");
  },
}));

export const deleteSourceMapRoute = createRoute((core) => ({
  endpoint: 'DELETE /api/apm/sourcemaps/{id}',
  options: {tags: ['access:apm']},
  params: t.type({
    path: t.type({
      id: t.string,
    }),
  }),
  handler: async ({ context, request }) => {
    // TODO(axw) there's no guarantee the ID refers to a sourcemap artifact.
    // We should investigate adding a kuery param to the deleteArtifact method,
    // to require that.
    const client = new FleetArtifactsClient(context.core.elasticsearch.client.asInternalUser, "apm");
    await client.deleteArtifact(context.params.path.id);
    await updateFleetPolicies(
      context.plugins.fleet.packagePolicyService,
      context.core.savedObjects.client,
      context.core.elasticsearch.client,
      context.logger,
    );
    return undefined;
  },
}));

export const uploadSourceMapRoute = createRoute((core) => ({
  endpoint: 'POST /api/apm/sourcemaps/{serviceName}/{serviceVersion}/{bundleFilepath}',
  options: {tags: ['access:apm']},
  params: t.type({
    path: t.type({
      serviceName: t.string,
      serviceVersion: t.string,
      bundleFilepath: t.string,
    }),
    body: t.intersection([
      t.type({
        version: t.number,
        sources: t.array(t.string),
        mappings: t.string,
        names: t.array(t.string),
      }),
      t.partial({
        file: t.string,
        sourceRoot: t.string,
        sourcesContent: t.array(t.string),
      })
    ]),
  }),
  handler: async ({ context, request }) => {
    const pathParams = context.params.path;
    const content = JSON.stringify({
      service_name: pathParams.serviceName,
      service_version: pathParams.serviceVersion,
      bundle_filepath: pathParams.bundleFilepath,
      sourcemap: context.params.body,
    });
    const identifier = `${pathParams.serviceName}-${pathParams.serviceVersion}-${pathParams.bundleFilepath}`;
    const client = new FleetArtifactsClient(context.core.elasticsearch.client.asInternalUser, "apm");
    // TODO(axw) "identifier" is not used as the document _id, and multiple artifacts with the same
    // identifier are possible. It might we worth investigating if this can be changed.
    const artifact = await client.createArtifact({content: content, type: "sourcemap", identifier});
    await updateFleetPolicies(
      context.plugins.fleet.packagePolicyService,
      context.core.savedObjects.client,
      context.core.elasticsearch.client,
      context.logger,
    );
    return artifact;
  },
}));
