/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PROCESSOR_EVENT,
  SERVICE_NAME
} from '../../../common/elasticsearch_fieldnames';

import {
  Setup,
  SetupTimeRange,
  SetupUIFilters
} from '../helpers/setup_request';

import { ProcessorEvent } from '../../../common/processor_event';

export interface ProfileAPIResponse {
  stacks: ProfileNode[];
}

interface ProfileNode {
  name: string;
  value: number;
  samples: number;
  children?: ProfileNode[];
}

interface ProfileAggregations {
  stacks: {
    buckets: Array<{
      duration_us: { value: number };
      cpu_ns: { value: number };
      samples_count: { value: number };
      top_hit: {
        hits: {
          hits: Array<{
            _source: {
              profile: {
                stack: Array<{
                  id: string;
                  filename: string;
                  function: string;
                  line: number;
                }>;
              };
            };
          }>;
        };
      };
    }>;
  };
}

export async function getProfile(
  setup: Setup & SetupTimeRange & SetupUIFilters,
  serviceName: string
): Promise<ProfileAPIResponse> {
  const { start, end, uiFiltersES, client, indices } = setup;
  const params = {
    index: indices['apm_oss.profileIndices'],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [PROCESSOR_EVENT]: ProcessorEvent.profile } },
            { term: { [SERVICE_NAME]: serviceName } },
            // TODO(axw) make the aggs dynamic, based on the requested profile type
            { exists: { field: 'profile.cpu.ns' } },
            {
              range: {
                '@timestamp': {
                  gte: start,
                  lte: end,
                  format: 'epoch_millis'
                }
              }
            },
            ...uiFiltersES
          ]
        }
      },
      aggs: {
        stacks: {
          terms: {
            // TODO(axw) use composite agg to ensure we don't miss anything
            field: 'profile.top.id',
            size: 1000
          },
          aggs: {
            // TODO(axw) make the aggs dynamic, based on the requested profile type
            duration_us: { sum: { field: 'profile.duration' } },
            cpu_ns: { sum: { field: 'profile.cpu.ns' } },
            samples_count: { sum: { field: 'profile.samples.count' } },
            top_hit: {
              top_hits: {
                size: 1,
                _source: { includes: ['profile.stack'] }
              }
            }
          }
        }
      }
    }
  };

  const resp = await client.search(params);
  const aggs: ProfileAggregations = resp.aggregations;

  const rootNodes = new Set<ProfileNode>();
  const profileNodes: { [key: string]: ProfileNode } = {};
  const frameChildren: { [key: string]: Set<ProfileNode> } = {};
  for (const stack of aggs.stacks.buckets) {
    let lastNode: ProfileNode | null = null;
    const frames = stack.top_hit.hits.hits[0]._source.profile.stack;
    for (const frame of frames) {
      let node = profileNodes[frame.id];
      if (node) {
        node.value += stack.cpu_ns.value;
        node.samples += stack.samples_count.value;
      } else {
        node = {
          name: frame.function,
          value: stack.cpu_ns.value,
          samples: stack.samples_count.value
        };
        profileNodes[frame.id] = node;
      }
      if (lastNode !== null) {
        let children = frameChildren[frame.id];
        if (children) {
          children.add(lastNode);
        } else {
          children = new Set<ProfileNode>([lastNode]);
          frameChildren[frame.id] = children;
        }
      }
      lastNode = node;
    }
    rootNodes.add(lastNode);
  }
  Object.entries(frameChildren).forEach(([id, children]) => {
    profileNodes[id].children = Array.from(children);
  });

  const result: ProfileAPIResponse = { stacks: Array.from(rootNodes) };
  return result;
}
