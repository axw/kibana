/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMBaseDoc } from './APMBaseDoc';
import { Container } from './fields/Container';
import { Host } from './fields/Host';
import { Kubernetes } from './fields/Kubernetes';
import { Process } from './fields/Process';
import { Service } from './fields/Service';

interface Processor {
  name: 'profile';
  event: 'profile';
}

export interface ProfileRaw extends APMBaseDoc {
  processor: Processor;
  profile: {
    duration?: number;
    cpu?: {
      ns: number;
      [key: string]: unknown;
    };
    samples?: {
      count: number;
      [key: string]: unknown;
    };
    alloc_objects?: {
      count: number;
      [key: string]: unknown;
    };
    alloc_space?: {
      bytes: number;
      [key: string]: unknown;
    };
    inuse_objects?: {
      count: number;
      [key: string]: unknown;
    };
    inuse_space?: {
      bytes: number;
      [key: string]: unknown;
    };
    top: {
      id: string;
      function: string;
      filename: string;
      line: number;
      [key: string]: unknown;
    };
    stack: Array<{
      id: string;
      function: string;
      filename: string;
      line: number;
      [key: string]: unknown;
    }>;
  };
  [key: string]: unknown;

  // Context shared with transactions, etc.
  container?: Container;
  host?: Host;
  kubernetes?: Kubernetes;
  process?: Process;
  service: Service;
}
