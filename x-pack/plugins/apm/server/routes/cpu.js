/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Boom from 'boom';

import getCpuSamples from '../lib/cpu/get_cpu_samples';
import { setupRequest } from '../lib/helpers/setup_request';
import { dateValidation } from '../lib/helpers/date_validation';

const pre = [{ method: setupRequest, assign: 'setup' }];
const ROOT = '/api/apm/services/{serviceName}/cpu';
const defaultErrorHandler = reply => err => {
  console.error(err.stack);
  reply(Boom.wrap(err, 400));
};

export function initCpuApi(server) {

server.route({
  path: ROOT,
  method: 'GET',
  config: {
    pre,
    validate: {
      query: Joi.object().keys({
        start: dateValidation,
        end: dateValidation
      })
    }
  },
  handler: (req, reply) => {
    const { serviceName } = req.params;
    const { setup } = req.pre;

    getCpuSamples({serviceName, setup}).then(function(res) {
      // getCpuSamples returns a list of nodes.
      // The UI expects a nested tree structure.
      let duration_ns;
      var treeNodes = {};
      res.nodes.forEach(function(node) {
        if (node.node_id == 'root') {
          duration_ns = node.duration_ns;
	}
        treeNodes[node.node_id] = {
          name: node.function,
          value: node.cpu_ns,
          samples: node.samples_count,
	};
      });
      res.nodes.forEach(function(node) {
	var parent = treeNodes[node.parent_id];
        if (!parent) {
	  return;
	}
	if (!parent.children) {
          parent.children = [];
	}
        parent.children.push(treeNodes[node.node_id]);
      });
      reply({
          tree: treeNodes['root'],
          duration_ns: duration_ns,
      });
    }).catch(defaultErrorHandler(reply));
  }
});

}
