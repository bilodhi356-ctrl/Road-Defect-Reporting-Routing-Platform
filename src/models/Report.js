const mongoose = require('mongoose');
const photoSchema = new mongoose.Schema({ url:{type:String,required:true}, publicId:String, uploadedAt:{type:Date,default:Date.now} }, {_id:false});
const commentSchema = new mongoose.Schema({ body:{type:String,required:true,maxlength:1000}, author:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}, createdAt:{type:Date,default:Date.now} });
const auditSchema = new mongoose.Schema({ action:{type:String,required:true}, actor:{type:mongoose.Schema.Types.ObjectId,ref:'User'}, detail:String, createdAt:{type:Date,default:Date.now} }, {_id:false});
const reportSchema = new mongoose.Schema({
 reference:{type:String,required:true,unique:true,index:true}, category:{type:String,required:true,enum:['Pothole','Erosion / washout','Damaged culvert','Blocked drainage','Damaged bridge','Other road hazard']}, severity:{type:String,required:true,enum:['Low','Medium','High','Critical']}, description:{type:String,trim:true,maxlength:2000,default:''}, roadName:{type:String,trim:true,maxlength:120,default:''}, landmark:{type:String,trim:true,maxlength:160,default:''}, contact:{consent:{type:Boolean,default:false},email:{type:String,trim:true,lowercase:true,default:''},phone:{type:String,trim:true,default:''}},
 location:{type:{type:String,enum:['Point'],default:'Point'},coordinates:{type:[Number],required:true,validate:{validator:v=>v.length===2&&v[0]>=-180&&v[0]<=180&&v[1]>=-90&&v[1]<=90,message:'Invalid coordinates'}}}, county:{type:String,required:true,index:true}, office:{type:String,required:true}, status:{type:String,enum:['New','In progress','Resolved'],default:'New',index:true}, reporterPhoto:photoSchema, repairPhotos:[photoSchema], assignedTo:{type:mongoose.Schema.Types.ObjectId,ref:'User',default:null}, comments:[commentSchema], auditTrail:[auditSchema]
},{timestamps:true});
reportSchema.index({location:'2dsphere'}); reportSchema.index({category:1,createdAt:-1});
module.exports = mongoose.model('Report', reportSchema);
