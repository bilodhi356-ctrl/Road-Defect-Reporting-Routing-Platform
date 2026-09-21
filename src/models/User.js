const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema({ name:{type:String,required:true,trim:true,maxlength:80}, email:{type:String,required:true,unique:true,lowercase:true,trim:true}, passwordHash:{type:String,required:true,select:false}, role:{type:String,enum:['admin','coordinator','officer'],default:'officer'}, office:{type:String,required:true}, active:{type:Boolean,default:true} }, {timestamps:true});
userSchema.methods.verifyPassword = function(password) { return bcrypt.compare(password, this.passwordHash); };
module.exports = mongoose.model('User', userSchema);
