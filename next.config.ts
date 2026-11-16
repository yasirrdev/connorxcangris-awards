import type {NextConfig} from 'next';
import {developmentHosts} from './lib/dev-origins';

const development = process.env.NODE_ENV === 'development';
const isolateValidation = development && process.env.AWARDS_ISOLATED_DEV === '1';

const config:NextConfig = {
  poweredByHeader:false,
  ...(development ? {allowedDevOrigins:developmentHosts} : {}),
  ...(isolateValidation ? {distDir:'.next-validation',typescript:{tsconfigPath:'tsconfig.validation.json'}} : {}),
  experimental:{serverActions:{bodySizeLimit:'3mb'}}
};

export default config;

