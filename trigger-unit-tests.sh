
deno test --allow-net src/investment-advisor/investment-advisor.spec.ts

deno test --allow-net --unstable src/investment-optimizer/investment-optimizer.spec.ts # the unstable tag is needed due to the deno mongo db early adopter approach