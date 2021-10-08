import { VolatilityFarmer } from "./volatility-farmer.ts"
import { Registry } from "https://deno.land/x/injector@v1.1.0/mod.ts"
import { InvestmentAdvisor, InvestmentAdvisorETHLong, BybitConnector, IPersistenceService, MongoService, IExchangeConnector } from "../../../deps.ts"


// get parameters
const apiKey = Deno.args[0]
const apiSecret = Deno.args[1]
const dbUser = Deno.args[2]
const dbPW = Deno.args[3]
const investmentAdvisorClassName = (Deno.args[4] === undefined) ? "InvestmentAdvisor" : Deno.args[4]
const exchangeConnectorClassName = (Deno.args[5] === undefined) ? "BybitConnector" : Deno.args[5]
const persistenceServiceClassName = (Deno.args[6] === undefined) ? "MongoService" : Deno.args[6]
const persistenceHost = (Deno.args[7] === undefined) ? '65.21.110.40' : Deno.args[7]
const persistencePort = (Deno.args[8] === undefined) ? '27017' : Deno.args[8]


// Dependent On Components Handling
const registryInvestmentAdvisors = new Registry()
const registryExchangeConnectors = new Registry()
const registryPersistenceServices = new Registry()

registryInvestmentAdvisors.register(InvestmentAdvisorETHLong)
registryInvestmentAdvisors.register(InvestmentAdvisor)
registryExchangeConnectors.register(BybitConnector)
registryPersistenceServices.register(MongoService)

const exchangeConnector: IExchangeConnector = new (registryExchangeConnectors.get(exchangeConnectorClassName))(apiKey, apiSecret)
const persistenceService: IPersistenceService = new (registryPersistenceServices.get(persistenceServiceClassName))(`mongodb://${dbUser}:${dbPW}@${persistenceHost}:${persistencePort}`)
const investmentAdvisor: InvestmentAdvisor = new (registryInvestmentAdvisors.get(investmentAdvisorClassName))(apiKey, persistenceService)


// Dependency Injection via constructor injection
const volatilityFarmer: VolatilityFarmer = new VolatilityFarmer(apiKey, apiSecret, exchangeConnector, investmentAdvisor, persistenceService)


// start farming interval - farming each 4 seconds
const intervalLengthInSeconds = 4
volatilityFarmer.farm(intervalLengthInSeconds)

