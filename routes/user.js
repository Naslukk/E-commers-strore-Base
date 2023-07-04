const { response } = require('express');
var express = require('express');
const session = require('express-session');
const async = require('hbs/lib/async');
const { render } = require('../app');
var router = express.Router();
var productHelper= require('../helpers/product-helpers')
var userHelper= require('../helpers/user-helpers')

const verifyLogin=(req,res,next)=>{
  if(req.session.userLoggedIn){
    next()
  }else{
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/', async function (req, res, next) {
  let user=req.session.user
  let cartCount=null
  if(user){
    cartCount=await userHelper.getCartCount(user._id)
  }
  productHelper.getAlProducts().then((products)=>{
    res.render('user/view-products',{products,user,cartCount});
  })
});
router.get('/login',(req,res)=>{
  if (req.session.user) {
    res.redirect('/')
  }else{
    res.render('user/login',{"loginErr":req.session.userLoginErr})
    req.session.userLoggedErr=null
  }
})
router.post('/login',(req,res)=>{
  userHelper.doLogin(req.body).then((response)=>{
    if (response.status) {
      req.session.userLoggedIn=true
      req.session.user=response.user
      res.redirect('/')
    }else{
      req.session.userLoginErr='Invalid Email or password'
      res.redirect('/login')
    }
  })
})
router.get('/signup',(req,res)=>{
  res.render('user/signup')
})
router.post('/signup',(req,res)=>{
  userHelper.doSignup(req.body).then((response)=>{
    res.redirect('/login')
  })
})
router.get('/logout',(req,res)=>{
  req.session.user=null
  res.redirect('/')
})
router.get('/cart',verifyLogin,async(req,res)=>{
  let user = req.session.user
  let products = await userHelper.getCartProducts(req.session.user._id)
  let total=0
  let noItem=false
  if(products.length>0){
    total= await userHelper.getTotalAmount(user._id)
  }else{
    noItem=true
  }
  res.render('user/cart',{user,products,total,noItem})
})
router.get('/add-cart/:id',verifyLogin,(req,res)=>{
  userHelper.addToCart(req.params.id,req.session.user._id).then(()=>{
    res.json({status:true})
  })
})
router.post('/change-quantity',verifyLogin,(req,res,next)=>{
  userHelper. changeQuantity(req.body).then(async(response)=>{
    response.total= await userHelper.getTotalAmount(req.body.user)
    res.json(response)
  })
})
router.post('/cart-product-remove',(req,res)=>{
  console.log(req.body);
  userHelper.removeCartProduct(req.body).then(()=>{
    res.json({status:true})
  })
})
router.get("/place-order",verifyLogin,async(req,res)=>{
  let user = req.session.user
  let total= await userHelper.getTotalAmount(user._id)
  res.render('user/place-order',{user,total})
})
router.post('/place-order',async(req,res)=>{
  let products= await userHelper.getCartProductList(req.body.userId)
  let total= await userHelper.getTotalAmount(req.body.userId)
  userHelper.placeOrder(req.body,products,total).then((orderId)=>{
    if (req.body['payment-method']=='COD') {
      res.json({codSuccess:true})
    }else{
      userHelper.generateRazorpay(orderId,total).then((response)=>{
        res.json(response)
      })
    }
  })
})
router.get('/order-success',(req,res)=>{
  let user = req.session.user
  res.render('user/order-success',{user})
})
router.get('/orders',async(req,res)=>{
  let orders=await userHelper.getUserOrders(req.session.user._id)
  res.render('user/orders',{user:req.session.user,orders})
})
router.get('/view-order-products/:id',async(req,res)=>{
  let user = req.session.user
  let products =await userHelper.getOrderProducts(req.params.id)
  res.render('user/view-order-products',{user,products})
})

router.post('/verify-payment',(req,res)=>{
  userHelper.verifyPayment(req.body).then(()=>{
    userHelper.changePaymentStatus(req.body['order[receipt]']).then(()=>{
      res.json({status:true})
    })
  }).catch((err)=>{
    res.json({status:false})
  })
})

module.exports = router;  
