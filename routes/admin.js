var express = require('express');
const { response } = require('../app');
const adminHelpers = require('../helpers/admin -helpers');
var router = express.Router();
var productHelper=require('../helpers/product-helpers')
var adminHelper=require('../helpers/admin -helpers');
const async = require('hbs/lib/async');


const verifyAdminLogin=(req,res,next)=>{
  if(req.session.adminLoggedIn){
    next()
  }else{
    res.redirect('./adminLogin')
  }
}

/* GET users listing. */
router.get('/', function(req, res, next) {
  productHelper.getAlProducts().then((products)=>{
    res.render('admin/view-products',{admin:true,products});
  })
});
// ADD ADMIN
router.get('/adminSignup',(req,res)=>{
  res.render('admin/signup')
})
router.post('/adminSignup',(req,res)=>{
  adminHelper.doAdminSignup(req.body).then((response)=>{
    res.redirect('/adminLogin')
  })
})
// Admin Login
router.get('/adminLogin',(req,res)=>{
  if (req.session.admin) {
    res.redirect('/admin')
  }else{
    res.render('admin/login',{"loginErr":req.session.adminLoginErr})
    req.session.adminLoggedErr=null
  }
})
router.post('/adminlogin',(req,res)=>{
  adminHelper.doAdminLogin(req.body).then((response)=>{
    if (response.status) {
      req.session.adminLoggedIn=true
      req.session.admin=response.admin
      res.redirect('/admin')
    }else{
      req.session.userLoginErr='Invalid Email or password'
      res.redirect('/adminlogin')
    }
  })
})

router.get('/add-product',verifyAdminLogin,(req,res)=>{
  res.render('admin/add-product',{admin:true})
})
router.post('/add-product',(req,res)=>{
  productHelper.addProduct(req.body,(id)=>{
    let image=req.files.Image
    image.mv('./public/product-images/'+id+'.jpg',(err)=>{
      if(!err){
        res.render('admin/add-product',{admin:true})
      }else{
        console.log(err);
      }
    })
  })
})
router.get('/delete-product/:id',(req,res)=>{
  let proId=req.params.id
  productHelper.deleteProduct(proId).then((response)=>{
    res.redirect('/admin')
  })
})
router.get('/edit-product/:id',async(req,res)=>{
  let product=await productHelper.getProductDetails(req.params.id)
res.render('admin/edit-product',{admin:true,product})
})
router.post('/edit-product/:id',(req,res,next)=>{
  let id=req.params.id
  productHelper.updateProduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin')
    if(req.files.Image){
      let image=req.files.Image
      image.mv('./public/product-images/'+id+'.jpg')
    }
  })
})
router.get('/all-users',(req,res)=>{
  adminHelper.getAllUsers().then((usersData)=>{
    res.render('admin/all-users',{admin:true,usersData})
  })
})
router.get('/ban-user/:id',(req,res)=>{
  adminHelper.banUser(req.params.id).then((response)=>{
    res.redirect('/admin/all-users')
  })
})
router.get('/all-orders',(req,res)=>{
  adminHelper.getAllOrders().then(async(orders)=>{
    console.log(orders);
    for (let i = 0; i < orders.length; i++) {
      
      let products =await adminHelper.getOrderProducts(orders[i]._id)
      console.log(products.quantity);
      
    }
    
  })
})


module.exports = router;
