import next from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';
const config=[...next,...typescript,{ignores:['.next/**','.next-validation/**','.pnpm-store/**','next-env.d.ts','test-results/**','playwright-report/**']},
  {rules:{'@next/next/no-img-element':'off'}}];
export default config;


