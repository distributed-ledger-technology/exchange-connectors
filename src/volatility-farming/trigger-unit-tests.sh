
deno test --allow-net investment-advisor/investment-advisor.spec.ts

deno test --allow-net --unstable asset-manager/asset-manager.spec.ts  # the unstable tag is needed due to the deno mongo db early adopter approach