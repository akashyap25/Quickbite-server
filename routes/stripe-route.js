const express = require('express');
const stripe = require('stripe')(process.env.Secret_Key);
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.get('/', (req,res,next) => {
    console.log('GET request for stripe');
    res.json({
        message: 'It works'
    });
});

router.post('/pay', (req,res,next) => {
  console.log(req.body.token);
  const {token,amount} = req.body;
    const idempotencyKey = uuidv4();

    return stripe.customers.create({
        email: token.email,
        source: token
    }).then(customer => {
        stripe.charges.create({
            amount: amount * 100,
            currency: 'inr',
            customer: customer.id,
            receipt_email: token.email,
            description: `Purchased the product`,
        }, {idempotencyKey})
    }).then(result =>{
        res.status(200).json(result)
    }).catch(err => {
        console.log(err);
    });
});

module.exports = router;