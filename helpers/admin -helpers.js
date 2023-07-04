var db=require('../config/connection')
var collection=require('../config/collection')
var bcrypt=require('bcrypt')
const { response } = require('../app')
const async = require('hbs/lib/async')
var objectId= require('mongodb').ObjectId

module.exports={
    getAllUsers:()=>{
        return new Promise(async(resolve,reject)=>{
            let users= await db.get().collection(collection.USER_COLLECTION).find().toArray()
            resolve(users)
        })
    },
    banUser:(userId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.USER_COLLECTION).deleteOne({_id:objectId(userId)})
            resolve(response)
        })
    },
    doAdminSignup:(adminData)=>{
        return new Promise(async(resolve,reject)=>{
            adminData.Password=await bcrypt.hash(adminData.Password,10)
            db.get().collection(collection.ADMIN_COLLECTION).insertOne(adminData).then((data) => {
                resolve(data)
            })
        })
    },
    doAdminLogin:(adminData)=>{
        return new Promise(async(resolve,reject)=>{
            let loginStatus=false
            let response={}
            let admin= await db.get().collection(collection.ADMIN_COLLECTION).findOne({Email:adminData.Email})
            if (admin) {
                bcrypt.compare(adminData.Password,admin.Password).then((status)=>{
                    if (status) {
                        console.log('login success');
                        response.admin=admin
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
    getAllOrders:()=>{
        return new Promise(async(resolve,reject)=>{
            let orders= await db.get().collection(collection.ORDER_COLLECTION).find().toArray()
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
    }
}