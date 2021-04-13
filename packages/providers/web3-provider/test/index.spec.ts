import "mocha";
import { expect } from "chai";

import Web3 from "web3";
import WalletConnect from "@walletconnect/client";

import WalletConnectWeb3Provider from "../src";
import { TestNetwork } from "./shared/TestNetwork";
import { ethers } from "ethers";

// const TEST_SESSION_PARAMS = {
//   accounts: ["0x1d85568eEAbad713fBB5293B45ea066e552A90De"],
//   chainId: 1,
// };

const TEST_SESSION_PRIVATE_KEY =
  "0xa3dac6ca0b1c61f5f0a0b3a0acf93c9a52fd94e8e33d243d3b3a8b8c5dc37f0b";

const TEST_SESSION_WALLET = new ethers.Wallet(TEST_SESSION_PRIVATE_KEY);

const TEST_SESSION_CHAIN_ID = 123;

const TEST_SESSION_RPC_HOST = "http://localhost:8545";

const TEST_PROVIDER_OPTS = {
  chainId: TEST_SESSION_CHAIN_ID,
  qrcode: false,
  bridge: "https://staging.walletconnect.org",
  rpc: {
    [TEST_SESSION_CHAIN_ID]: TEST_SESSION_RPC_HOST,
  },
};

describe("WalletConnectWeb3Provider", function() {
  this.timeout(300_00);
  let testNetwork: TestNetwork;

  it("open test-network", async () => {
    testNetwork = await TestNetwork.init();
    expect(!!testNetwork.provider).to.be.true;
  });

  it("instantiate successfully", () => {
    const provider = new WalletConnectWeb3Provider(TEST_PROVIDER_OPTS);
    expect(!!provider).to.be.true;
  });

  it("enable successfully", async () => {
    const provider = new WalletConnectWeb3Provider(TEST_PROVIDER_OPTS);

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        provider.wc.on("display_uri", (error, payload) => {
          if (error) {
            reject(error);
          }

          const uri = payload.params[0];

          const client = new WalletConnect({ uri });

          client.on("session_request", error => {
            if (error) {
              reject(error);
            }

            client.approveSession({
              accounts: [TEST_SESSION_WALLET.address],
              chainId: TEST_SESSION_CHAIN_ID,
            });

            resolve();
          });
        });
      }),
      new Promise<void>(async resolve => {
        try {
          const providerAccounts = await provider.enable();
          expect(providerAccounts).to.eql({
            accounts: [TEST_SESSION_WALLET.address],
            chainId: TEST_SESSION_CHAIN_ID,
          });

          const web3 = new Web3(provider as any);

          const web3Accounts = await web3.eth.getAccounts();
          expect(web3Accounts).to.eql([TEST_SESSION_WALLET.address]);

          const web3ChainId = await web3.eth.getChainId();
          expect(web3ChainId).to.eql(TEST_SESSION_CHAIN_ID);

          resolve();
        } catch (error) {
          console.log(error);
        }
      }),
    ]);
  });

  it("closes test-network", async () => {
    await testNetwork.close();
  });
});
