/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

function getParentId(nodeBucket) {
  if (!nodeBucket.parent_id.buckets) {
    return null;
  }
  return nodeBucket.parent_id.buckets[0].key;
}

async function getCpuSamples({ serviceName, setup }) {
  const { start, end, client, config } = setup;

  const params = {
    index: 'profilebeat-*',
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: start,
                  lte: end,
                  format: 'epoch_millis'
                }
              }
            }
          ]
        }
      },
      aggs: {
        nodes: {
          terms: {
            // TODO(axw) composite agg so we can paginate?
            field: 'node_id',
            size: 50000,
	  },
          aggs: {
	    parent_id: { terms: {field: 'parent_id'} },
	    function: { terms: {field: 'function'} },
	    cpu_ns: { sum: {field: 'cpu.ns'} },
	    duration_ns: { sum: {field: 'duration.ns'} },
	    samples_count: { sum: {field: 'samples.count'} }
	  }
        }
      }
    }
  };

  const resp = await client('search', params);
  return {
    nodes: resp.aggregations.nodes.buckets.map(bucket => ({
      node_id: bucket.key,
      parent_id: bucket.parent_id.buckets.map(b => b.key)[0] || null,
      function: bucket.function.buckets.map(b => b.key)[0] || null,
      cpu_ns: bucket.cpu_ns.value,
      duration_ns: bucket.duration_ns.value,
      samples_count: bucket.samples_count.value
    })),
  };
}

export default getCpuSamples;
