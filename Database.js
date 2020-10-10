var USE_DB = true;
var mongojs = USE_DB ? require("mongojs") : null;
var db = USE_DB ? mongojs('mongodb+srv://dbUser:8dt4p9ndpy2p@cluster0.7wo5q.mongodb.net/myGame?retryWrites=true&w=majority', ['account','progress']) : null;

//account:  {username:string, password:string}
//progress:  {username:string, items:[{id:string,amount:number}]}

Database = {};
Database.isValidPassword = function(data,cb){
    if(!USE_DB)
        return cb(true);
	db.account.findOne({username:data.username,password:data.password},function(err,res){
		if(res)
			cb(true);
		else
			cb(false);
	});
}
Database.isUsernameTaken = function(data,cb){
    if(!USE_DB)
        return cb(false);
	db.account.findOne({username:data.username},function(err,res){
		if(res)
			cb(true);
		else
			cb(false);
	});
}
Database.addUser = function(data,cb){
    if(!USE_DB)
        return cb();
	db.account.insert({username:data.username,password:data.password},function(err){
        Database.savePlayerProgress({username:data.username,items:[]},function(){
            cb();
        })
	});
}
Database.getPlayerProgress = function(username,cb){
    if(!USE_DB)
        return cb({items:[]});
	db.progress.findOne({username:username},function(err,res){
		if(res)
			cb({items:res.items});
		else
			cb({items:[]});
	});
}
Database.savePlayerProgress = function(data,cb){
    cb = cb || function(){}
    if(!USE_DB)
        return cb();
    db.progress.updateOne(
		{username : data.username},
		{$set : {"items" : data.items}},
		{ upsert : true });
	cb();
}