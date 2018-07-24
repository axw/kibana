/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Boom from 'boom';

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
      //const { serviceName } = req.params;
      //const { setup } = req.pre;

	    /*
      return getTopTransactions({
        serviceName,
        transactionType,
        setup
      })
        .then(reply)
        .catch(defaultErrorHandler(reply));
	*/
    reply({
      tree: {
        name: 'root',
        value: 5,
        children: [
          {
            name: 'a',
            value: 1,
          },
          {
            name: 'b',
            value: 2,
          }
        ]
      }
    });
  }
});

}
