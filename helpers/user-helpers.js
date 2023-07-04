var db=require('../config/connection')
var collection=require('../config/collection')
var bcrypt=require('bcrypt')
const { response } = require('../app')
const { reject, use } = require('bcrypt/promises')
var objectId= require('mongodb').ObjectId
const Razorpay= require('razorpay')
const { resolve } = require('path')

var instance = new Razorpay({ 
    key_id: 'rzp_test_8pznlBUOp3SYjk', 
    key_secret: 'ujWjsmFkMhDG5g6Oa6A7MJUD' 
})

module.exports={
    doSignup:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            userData.Password=await bcrypt.hash(userData.Password,10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                resolve(data)
            })
        })
    },
    doLogin:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            let loginStatus=false
            let response={}
            let user= await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
            if (user) {
                bcrypt.compare(userData.Password,user.Password).then((status)=>{
                    if (status) {
                        console.log('login success');
                        response.user=user
                        response.status=true
                        resolve(response)
                    }else{
                        console.log('login error');
                        resolve({status:false})
                    }
                })
            }else{
                console.log('login error');
                resolve({status:false})
            }
        })
    },
    addToCart: (proId, userId) => {
        let proObj = {
            item: objectId(proId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == proId)
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION).updateOne({user:objectId(userId), 'products.item': objectId(proId) },
                        {
                            $inc: { 'products.$.quantity': 1 }
                        }
                    ).then(() => {
                        resolve
                    })
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId) },
                        {
                            $push: { products: proObj }
                        }
                    ).then((response) => {
                        resolve()
                    })
                }
            } else {
                let cartObj = {
                    user: objectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },
    getCartProducts:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cartItems= await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:objectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
            ]).toArray()
            resolve(cartItems)
        })
    },
    getCartCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let count=0
            let cart= await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            if(cart){
                count=cart.products.length
            }
            resolve(count)
        })
    },
    changeQuantity: (data) => {
        data.count=parseInt(data.count)
        data.quantity-parseInt(data.quantity)
        return new Promise((resolve, reject) => {
            if (data.count== -1 && data.quantity ==1) {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(data.cart) },
                    {
                        $pull: { products: { item: objectId(data.product) } }
                    }
                ).then((response) => {
                    resolve({ removeProduct:true })
                })
            } else {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(data.cart), 'products.item': objectId(data.product) },
                    {
                        $inc: { 'products.$.quantity': data.count }
                    }
                ).then(() => {
                    resolve({status:true})
                })
            }
        })
    },
    removeCartProduct: (data) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).updateOne({_id: objectId(data.cart) },
                {
                    $pull: { products: {item:objectId(data.product)} }
                }
            ).then((response) => {
                resolve()
            })
        })
    },
    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group:{
                        _id:null,
                        total:{$sum:{$multiply:['$quantity',{$toInt:'$product.Price'}]}}
                    }
                }
            ]).toArray()
            resolve(total[0].total)
        })
    },
    placeOrder:(order,products,total)=>{
        return new Promise((resolve,reject)=>{
            let status=order['payment-method']==='COD'?'placed':'pending'
            let orderObj={
                deliveryDetails:{
                    name:order.Name,
                    mobile:order.Phone,
                    address:order.Address,
                    city:order.City,
                    state:order.State,
                    country:order.Country,
                    pincode:order.Pin
                },
                date: new Date(),
                userId:objectId(order.userId),
                paymentMethod:order['payment-method'],
                products:products,
                total:total,
                status:status
            }

            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                db.get().collection(collection.CART_COLLECTION).deleteOne({user:objectId(order.userId)})
                resolve(response.insertedId)
            })
        })
    },
    getCartProductList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            resolve(cart.products)
        })
    },
    getUserOrders:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let orders=await db.get().collection(collection.ORDER_COLLECTION).find({userId:objectId(userId)}).toArray()
            resolve(orders)
        })
    },
    getOrderProducts:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
            let orderItems= await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{_id:objectId(orderId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
            ]).toArray()
            resolve(orderItems)
        })
    },
    generateRazorpay:(orderId,total)=>{
        return new Promise((resolve, reject) => {
            var options = {
                amount: total*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: ""+orderId
            };
            instance.orders.create(options, function (err, order) {
                if (err) {
                    console.log(err);
                }else{
                resolve(order)
                }
            });
        })
    },
    verifyPayment:(details) =>{
        return new Promise((resolve,reject)=>{
            var crypto = require("crypto");
            let hmac = crypto.createHmac('sha256', 'ujWjsmFkMhDG5g6Oa6A7MJUD')

            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]'])
            hmac=hmac.digest('hex')
            if(hmac==details['payment[razorpay_signature]']){
                resolve()
            }else{
                reject()
            }
        })
    },
    changePaymentStatus:(orderId)=>{
        return new Promise ((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION)
            .updateOne({_id:objectId(orderId)},
            {
                $set:{
                    status:'placed'
                }
            }
            ).then(()=>{
                resolve()
            })
        })
    }
}