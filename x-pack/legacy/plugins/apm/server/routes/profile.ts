/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { setupRequest } from '../lib/helpers/setup_request';
import { getProfile } from '../lib/profiles/get_profile';
import { createRoute } from './create_route';
import { uiFiltersRt, rangeRt } from './default_api_types';

export const profileRoute = createRoute(() => ({
  path: '/api/apm/services/{serviceName}/profile',
  params: {
    path: t.type({
      serviceName: t.string
    }),
    query: t.intersection([uiFiltersRt, rangeRt])
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { params } = context;
    const { serviceName } = params.path;
    return getProfile(setup, serviceName);
  }
}));
