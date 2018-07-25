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
      var treeNodes = {};
      res.nodes.forEach(function(node) {
        treeNodes[node.node_id] = {
          name: node.function,
          // TODO(axw) how will we convey that
          // the sum of cpu_ns is not 100% CPU?
          // Need to be able to send additional
          // data back (namely duration_ns).
          value: node.cpu_ns,
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
      reply({tree: treeNodes['root']});
    }).catch(defaultErrorHandler(reply));
  }
});

}
