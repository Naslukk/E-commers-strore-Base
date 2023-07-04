var mongoClient= require('mongodb').MongoClient
var state={
    db:null
}

module.exports.connect=(done)=>{
    var url = "mongodb://localhost:27017";
    var dbname = 'shopping'

    mongoClient.connect(url,(err,data)=>{
        if(err) return done(err)
        state.db=data.db(dbname)
    })
    done()
}
module.exports.get=()=>{
    return state.db
}