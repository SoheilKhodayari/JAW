const path = require('path');
const express = require('express');
const router = express.Router();


router.get('/docreferrer/:payload', function(req, res, next) {
  // redirect so that `document.referrer` is tainted with :payload string
  res.render('docreferrer', {redirectTo: req.query.next});
});

router.get('/winname', function(req, res, next) {
  res.render('winname', {payload: req.query.payload});
});


module.exports = router;
