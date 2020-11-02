import express from 'express'
import bodyParser from 'body-parser'
import ngrok from 'ngrok'
import { decodeJWT } from 'did-jwt'
import { Credentials } from 'uport-credentials'
import transports from 'uport-transports/lib/transport/index.js'
import message from 'uport-transports/lib/message/util.js'
import { Resolver } from 'did-resolver'
import { getResolver } from 'ethr-did-resolver'

let endpoint = ''
const app = express();
app.use(bodyParser.json({ type: '*/*' }))

// You can set a rpc endpoint to be used by the web3 provider
// You can also set an address for your own ethr-did-registry contract
// Here for simplicity, the Rinkeby address of ethr-did-registry smart contract is provided as registry
const providerConfig = { rpcUrl: 'https://rinkeby.infura.io/ethr-did', registry: '0xdca7ef03e98e0dc2b855be647c39abe984fcf21b' }

// getResolver will return an object with a key/value pair of { "ethr": resolver } where resolver is a function used by the generic did resolver.
const ethrDidResolver = getResolver(providerConfig)
const didResolver = new Resolver(ethrDidResolver)

//setup Credentials object with newly created application identity.
const credentials = new Credentials({
  appName: 'Login Example',
  did: 'did:ethr:0x31486054a6ad2c0b685cd89ce0ba018e210d504e',
  privateKey: 'ef6a01d0d98ba08bd23ee8b0c650076c65d629560940de9935d0f46f00679e01',
  resolver: didResolver
})

app.get('/', (req, res) => {
  credentials.createDisclosureRequest({
    requested: ["name"],
    notifications: true,
    callbackUrl: endpoint + '/callback'
  }).then(requestToken => {
    console.log(decodeJWT(requestToken))  //log request token to console
    const uri = message.paramsToQueryString(message.messageToURI(requestToken), { callback_type: 'post' })
    const qr = transports.ui.getImageDataURI(uri)
    res.send(`<div><img src="${qr}"/></div>`)
  })
})

app.post('/callback', (req, res) => {
  const jwt = req.body.access_token
  console.log(jwt);
  credentials.authenticateDisclosureResponse(jwt).then(credentials => {
    console.log(credentials);
    // Validate the information and apply authorization logic
  }).catch(err => {
    console.log(err)
  })
})

// run the app server and tunneling service
const server = app.listen(8088, () => {
  ngrok.connect(8088).then(ngrokUrl => {
    endpoint = ngrokUrl
    console.log(`Login Service running, open at ${endpoint}`)
  })
})