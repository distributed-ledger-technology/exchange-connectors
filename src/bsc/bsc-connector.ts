
// https://docs.binance.org/smart-chain/developer/rpc.html

import { UnitConverter } from "../utility-boxes/units";


const Web3 = require('web3');
// mainnet
const web3 = new Web3('https://bsc-dataseed1.binance.org:443');

const privateKey = process.argv[2]
const account = web3.eth.accounts.privateKeyToAccount(privateKey)

web3.eth.getBalance("0xc74ea0869e49Aad10B3dedd8D56D74686fAfC7A0")
    .then((balanceInWei: any) => {
        console.log(`balanceInWei: ${balanceInWei}`)
        console.log(`balanceInETH: ${UnitConverter.convert("Wei", balanceInWei, "Ether")}`)
    })



// console.log(account)
