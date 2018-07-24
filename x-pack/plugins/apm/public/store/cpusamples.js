/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rest from '../services/rest';
import { createActionTypes, createAction, createReducer } from './apiHelpers';

const actionTypes = createActionTypes('CPU_SAMPLES');
export const [CPU_SAMPLES_LOADING, CPU_SAMPLES_SUCCESS, CPU_SAMPLES_FAILURE] = actionTypes;

const INITIAL_DATA = {};
const cpuSamples = createReducer(actionTypes, INITIAL_DATA);
export const loadCpuSamples = createAction(actionTypes, rest.loadCpuSamples);

export function getCpuSamples(state) {
  return state.cpuSamples;
}

export default cpuSamples;
