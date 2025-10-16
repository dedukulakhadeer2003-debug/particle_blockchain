const Wallet = require('./index');
const Transaction = require('./transaction');
const {verifySignature } = require('../utils_core');
const Blockchain = require('../blockchain_core');
const { STARTING_BALANCE } = require('../app_configuration');

describe('Wallet', () => {
  let wallet;
  
  beforeEach(() => {
    wallet = new Wallet();
  });

  it('has a `balance`', () => {
    expect(wallet).toHaveProperty('balance');
  });

  it('has a `publicKey`', () => {
    expect(wallet).toHaveProperty('publicKey');
    expect(typeof wallet.publicKey).toBe('string');
    expect(wallet.publicKey.length).toBeGreaterThan(0);
  });

  it('generates a valid key pair', () => {
    expect(wallet.keyPair).toBeDefined();
    expect(typeof wallet.keyPair.getPrivate('hex')).toBe('string');
  });

  describe('signing data', () => {
    const data = 'data';   
    it('verifies a signature', () => {
      expect(
        verifySignature({
          publicKey: wallet.publicKey,
          data,
          signature: wallet.sign(data)
        })
      ).toBe(true);
    });
    });

    it('handles object data signing', () => {
      const objectData = { message: 'test', value: 123 };
      const signature = wallet.sign(objectData);
      expect(
        verifySignature({
          publicKey: wallet.publicKey,
          data: objectData,
          signature: signature
        })
      ).toBe(true);
    });
  });

  describe('createTransaction', () => {
    describe('and the amount exceeds the balance', () => {
      it('throws an error', () => {
        expect(() => wallet.createTransaction({ 
          amount: 999999, 
          recipient: 'recipient' 
        })).toThrow('Amount exceeds balance');
      });
    });

    describe('and the amount is valid', () => {
      let transaction, amount, recipient;
      beforeEach(() => {
        amount = 50;
        recipient = 'recipient';
        transaction = wallet.createTransaction({ amount, recipient });
      });

      it('matches the transaction input with the wallet', () => {
        expect(transaction.input.address).toEqual(wallet.publicKey);
      });

      it('deducts the amount from sender balance', () => {
        expect(transaction.outputMap[wallet.publicKey]).toEqual(wallet.balance - amount);
      });
    });

    describe('and a chain is passed', () => {
      it('calls `Wallet.calculateBalance`', () => {
        const calculateBalanceMock = jest.fn();
        const originalCalculateBalance = Wallet.calculateBalance;
        
        Wallet.calculateBalance = calculateBalanceMock;
        
        wallet.createTransaction({
          recipient: 'recip',
          amount: 10,
          chain: new Blockchain().chain
        });

        expect(calculateBalanceMock).toHaveBeenCalled();        
        Wallet.calculateBalance = originalCalculateBalance;
      });
    });
  });

  describe('calculateBalance()', () => {
    let blockchain;
    beforeEach(() => {
      blockchain = new Blockchain();
    });

    describe('and there are no outputs for the wallet', () => {
      it('returns the `STARTING_BALANCE`', () => {
        expect(
          Wallet.calculateBalance({
            chain: blockchain.chain,
            address: wallet.publicKey
          })
        ).toEqual(STARTING_BALANCE);
      });
    });

    describe('and there are outputs for the wallet', () => {
      let transactionOne, transactionTwo;
      beforeEach(() => {
        transactionOne = new Wallet().createTransaction({
          recipient: wallet.publicKey,
          amount: 50
        });

        blockchain.addBlock({ data: [transactionOne, transactionTwo] });
      });

      it('adds the sum of all outputs to the wallet balance', () => {
        expect(
          Wallet.calculateBalance({
            chain: blockchain.chain,
            address: wallet.publicKey
          })
        ).toEqual(
          STARTING_BALANCE +
          transactionOne.outputMap[wallet.publicKey] +
          transactionTwo.outputMap[wallet.publicKey]
        );
      });

      describe('and the wallet has made a transaction', () => {
        let recentTransaction;
        beforeEach(() => {
          recentTransaction = wallet.createTransaction({
            recipient: 'recip_address',
            amount: 30
          });

          blockchain.addBlock({ data: [recentTransaction] });
        });
        describe('and there are outputs next to and after the recent transaction', () => {
          let sameBlockTransaction, nextBlockTransaction;

          beforeEach(() => {
            recentTransaction = wallet.createTransaction({
              recipient: 'address',
              amount: 60
            });

            sameBlockTransaction = Transaction.rewardTransaction({ minerWallet: wallet });
            blockchain.addBlock({ data: [recentTransaction, sameBlockTransaction] });
            nextBlockTransaction = new Wallet().createTransaction({
              recipient: wallet.publicKey, 
              amount: 75
            });

            blockchain.addBlock({ data: [nextBlockTransaction] });
          });
          it('includes the output amounts in the returned balance', () => {
            expect(
              Wallet.calculateBalance({
                chain: blockchain.chain,
                address: wallet.publicKey
              })
            ).toEqual(
              recentTransaction.outputMap[wallet.publicKey] +
              sameBlockTransaction.outputMap[wallet.publicKey] +
              nextBlockTransaction.outputMap[wallet.publicKey]
            );
          });
        });
      });
    });

    describe('and the chain is empty', () => {
      it('returns STARTING_BALANCE for empty chain', () => {
        expect(
          Wallet.calculateBalance({
            chain: [],
            address: wallet.publicKey
          })
        ).toEqual(STARTING_BALANCE);
      });
    });
  });
});
