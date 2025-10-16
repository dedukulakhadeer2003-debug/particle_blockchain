const Transaction = require('./transaction');
const Wallet = require('./index');
const { verifySignature } = require('../utils_core');
const { REWARD_INPUT, MINING_REWARD } = require('../app_configuration');

describe('Transaction', () => {
  let transaction, senderWallet, recipient, amount;
  beforeEach(() => {
    senderWallet = new Wallet();
    recipient = 'recipient_public_key';
    amount = 50;
    transaction = new Transaction({ senderWallet, recipient, amount });
  });

  it('has an `id`', () => {
    expect(transaction).toHaveProperty('id');
    expect(typeof transaction.id).toBe('string');
  });

  describe('outputMap', () => {
    it('has an `outputMap`', () => {
      expect(transaction).toHaveProperty('outputMap');
      expect(typeof transaction.outputMap).toBe('object');
    });

    it('outputs the amount to the recipient', () => {
      expect(transaction.outputMap[recipient]).toEqual(amount);
    });

    it('outputs the remaining balance for the `senderWallet`', () => {
      expect(transaction.outputMap[senderWallet.publicKey])
        .toEqual(senderWallet.balance - amount);
    });

    it('has valid output map structure', () => {
      expect(Object.keys(transaction.outputMap).length).toBe(2);
      expect(transaction.outputMap).toHaveProperty(recipient);
      expect(transaction.outputMap).toHaveProperty(senderWallet.publicKey);
    });
  });

  describe('input', () => {
    it('has an `input`', () => {
      expect(transaction).toHaveProperty('input');
      expect(typeof transaction.input).toBe('object');
    });

    it('has a `timestamp` in the input', () => {
      expect(transaction.input).toHaveProperty('timestamp');
      expect(typeof transaction.input.timestamp).toBe('number');
    });

    it('sets the `address` to the `senderWallet` publicKey', () => {
      expect(transaction.input.address).toEqual(senderWallet.publicKey);
    });

    it('signs the input', () => {
      expect(
        verifySignature({
          publicKey: senderWallet.publicKey,
          data: transaction.outputMap,
          signature: transaction.input.signature
        })
      ).toBe(true);
    });
    it('has valid input structure', () => {
      expect(transaction.input).toHaveProperty('timestamp');
      expect(transaction.input).toHaveProperty('amount');
      expect(transaction.input).toHaveProperty('address');
      expect(transaction.input).toHaveProperty('signature');
    });
  });

  describe('validTransaction', () => {
    let errorMock;
    beforeEach(() => {
      errorMock = jest.fn();
      global.console.error = errorMock;
    });

    describe('when the transaction is invalid', () => {
      describe('and a transaction outputMap value is invalid', () => {
        it('returns false and logs an error', () => {
          transaction.outputMap[senderWallet.publicKey] = 999999;
          expect(Transaction.validTransaction(transaction)).toBe(false);
          expect(errorMock).toHaveBeenCalled();
        });
      });

      describe('and a transaction input signature is invalid', () => {
        it('returns false and logs an error', () => {
          transaction.input.signature = new Wallet().sign('data');
          expect(Transaction.validTransaction(transaction)).toBe(false);
          expect(errorMock).toHaveBeenCalled();
        });
      });

      it('returns false for transaction with missing input', () => {
        const invalidTransaction = { ...transaction, input: null };
        expect(Transaction.validTransaction(invalidTransaction)).toBe(false);
        expect(errorMock).toHaveBeenCalled();
      });
    });
  });

  describe('update()', () => {
    let originalSignature, originalSenderOutput, nextRecipient, nextAmount;
    describe('and the amount is invalid', () => {
      it('throws an error', () => {
        expect(() => {
          transaction.update({
            senderWallet, recipient: 'recipient', amount: 999999
          });
        }).toThrow('Amount exceeds balance');
      });
    });

    describe('and the amount is valid', () => {
      beforeEach(() => {
        originalSignature = transaction.input.signature;
        originalSenderOutput = transaction.outputMap[senderWallet.publicKey];
        nextRecipient = 'next_recipient';
        nextAmount = 50;
        transaction.update({
          senderWallet, recipient: nextRecipient, amount: nextAmount
        });
      });

      it('outputs the amount to the next recipient', () => {
        expect(transaction.outputMap[nextRecipient]).toEqual(nextAmount);
      });

      it('maintains a total output that matches the input amount', () => {
        expect(
          Object.values(transaction.outputMap)
            .reduce((total, outputAmount) => total + outputAmount)
        ).toEqual(transaction.input.amount);
      });

      it('resigns the transaction', () => {
        expect(transaction.input.signature).not.toEqual(originalSignature);
      });

      describe('and another update for the same recipient', () => {
        let addedAmount;
        beforeEach(() => {
          addedAmount = 80;
          transaction.update({
            senderWallet, recipient: nextRecipient, amount: addedAmount
          });
        });

        it('adds to the recipient amount', () => {
          expect(transaction.outputMap[nextRecipient])
            .toEqual(nextAmount + addedAmount);
        });

        it('subtracts the amount from the original sender output amount', () => {
          expect(transaction.outputMap[senderWallet.publicKey])
            .toEqual(originalSenderOutput - nextAmount - addedAmount);
        });
      });
    });
  });

  describe('rewardTransaction()', () => {
    let rewardTransaction, minerWallet;
    beforeEach(() => {
      minerWallet = new Wallet();
      rewardTransaction = Transaction.rewardTransaction({ minerWallet });
    });

    it('creates a valid reward transaction', () => {
      expect(Transaction.validTransaction(rewardTransaction)).toBe(true);
    });

    it('throws error for missing miner wallet', () => {
      expect(() => {
        Transaction.rewardTransaction({ minerWallet: null });
      }).toThrow('Miner wallet is required');
    });
  });

  describe('getDetails()', () => {
    it('returns transaction details', () => {
      const details = transaction.getDetails();
      expect(details).toHaveProperty('id');
      expect(details).toHaveProperty('input');
      expect(details).toHaveProperty('outputMap');
      expect(details).toHaveProperty('totalAmount');
    });
  });

  describe('isRewardTransaction()', () => {
    it('returns false for regular transaction', () => {
      expect(transaction.isRewardTransaction()).toBe(false);
    });

    it('returns true for reward transaction', () => {
      const rewardTransaction = Transaction.rewardTransaction({ 
        minerWallet: new Wallet() 
      });
      expect(rewardTransaction.isRewardTransaction()).toBe(true);
    });
  });
});
