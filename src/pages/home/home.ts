import { Component } from '@angular/core';
import { NavController,ActionSheetController, ToastController, LoadingController,Platform,normalizeURL } from 'ionic-angular';//引入 Platform 判断当前设备是否为安卓平台,


import { BaseUI } from '../../common/baseui';  //引入自定义的baseui框架
declare var cordova: any; //导入第三方的库（cordova）定义到 TS 项目中

//引入 vconsole 在移动端演示时可调控制台
import VConsole from 'vconsole';
var vConsole = new VConsole();

//引入所需组件
import { Camera, CameraOptions } from '@ionic-native/camera';
import { ImagePicker } from '@ionic-native/image-picker';
import { File } from '@ionic-native/file';
import { FilePath } from '@ionic-native/file-path';
import { FileTransfer, FileUploadOptions, FileTransferObject } from '@ionic-native/file-transfer';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage extends BaseUI {
  public lastImage = [];//保存图库中正确的图片路径的数组
  public imageLength = null;//保存图片地址的数组的长度
  public arryNum = 0;
  constructor(public navCtrl: NavController,
              public actionSheetCtrl: ActionSheetController, //注册ActionSheetController模块
              public toastCtrl: ToastController, //注册ToastController模块
              public loadingCtrl: LoadingController, //注册LoadingController模块
              public camera: Camera,
              private imagePicker: ImagePicker,
              private file: File,
              private transfer: FileTransfer,
              public filePath: FilePath,
              public platform: Platform,
              ) {
    super();
  }

  //点击“选择...”弹出ActionSheet选项
  presentActionSheet(){
    let actionSheet = this.actionSheetCtrl.create({
      title: '选择图片',
      buttons: [
        {
          text: '从图片库中选择',
          handler: () => {
            this.takePicture();
          }
        },{
          text: '使用相机',
          handler: () => {
            this.takePictureCamera();
          }
        },{
          text: '取消',
          role: 'cancel',
          handler: () => {

          }
        }
      ]
    });
    actionSheet.present();
  }

  // 定义从图库获取照片的方法
  takePicture() {
    var options = {//定义从图库获取图片的一些参数
      quality: 50, //图片的质量
    };
    //从相册获取到图片
    this.imagePicker.getPictures(options).then((results) => {
      this.lastImage = this.lastImage.concat(results);  //获取到图片的地址
      console.log(this.lastImage);
      this.imageLength = this.lastImage.length; //获取到图片地址的长度
    }, (err) => {
      console.log(err);
      super.showToast(this.toastCtrl, "选择图片出现错误，请在 App 中操作或检查相关权限。");
    });
  }

  //定义从相机拍照获取图片的方法
  takePictureCamera(){

    //定义相机的一些参数
    var options = {
      quality: 50, //图片的质量
      sourceType: this.camera.PictureSourceType.CAMERA, //图片来源
      saveToPhotoAlbum: false, //是否保存拍摄的照片到相册中去
      correctOrientation: true //是否纠正拍摄的照片的方向
    };

    //获取图片的方法
    this.camera.getPicture(options).then((imagePath) => {
      console.log("获取图库中图片路径："+imagePath);

      //获取正确的路径
      var correctPath = imagePath.substr(0, imagePath.lastIndexOf('/') + 1);
      //获取正确的文件名
      var currentName = imagePath.substr(imagePath.lastIndexOf('/') + 1);
      console.log("获取正确的路径"+correctPath)
      console.log("获取正确的文件名"+currentName)
      //调用自定义函数 copyFileToLocalDir(取到图片的路径，图片的名字，生成新的图片名字) 将图片进行一下另存为，调用this.createFileName()为图片生成新的文件名
      this.copyFileToLocalDir(correctPath, currentName, this.createFileName());

    }, (err) => {
      super.showToast(this.toastCtrl, "获取图片出现错误，请在 App 中操作或检查相关权限。");
    });
  }



//将获取到的图片或者相机拍摄到的图片使用cordova插件进行一下另存为，用于后期的图片上传使用（执行这一步主要是为了防止拍照后不在相册保存的情况下能够拿到图片路径）
//使用cordova组件cordova.file.dataDirectory生成一个默认路径，专门用于存储一些临时的东西
//使用File中的一个方法copyFile(纠正后的图片路径，图片的名字，使用cordova生成一个默认路径，图片新名字)对图片进行另存为；
  copyFileToLocalDir(namePath, currentName, newFileName) {
    this.file.copyFile(namePath, currentName, cordova.file.dataDirectory, newFileName).then(success => {
      var cameraArrImg = [];
      cameraArrImg.push(this.pathForImage(newFileName)) ;
      this.lastImage = this.lastImage.concat(cameraArrImg);  //获取到图片的地址
      this.imageLength = this.lastImage.length; //获取到图片地址的长度
      console.log(this.lastImage);
      console.log(this.lastImage);
    }, error => {
      super.showToast(this.toastCtrl, "存储图片到本地图库出现错误。");
    });
  }

  //为文件生成一个新的文件名 在函数copyFileToLocalDir()的第三个参数中调用
  createFileName() {
    var d = new Date(),
      n = d.getTime(),
      newFileName = n + ".jpg"; //拼接文件名
    return newFileName;
  }

//处理图片的路径为可以上传的路径在图片上传函数uploadImage()中调用。
  public pathForImage(img) {
    if (img === null) {
      return '';
    } else {
      return normalizeURL(cordova.file.dataDirectory + img);
    }
  }




  //点击“上传”时执行图片上传操作
  uploadImage() {
    var loading = super.showLoading(this.loadingCtrl, "上传中...");
    this.uploadImagesFunction(loading);
  }

  //封装 多图上传函数
  uploadImagesFunction(loading){

    if(this.arryNum >= this.lastImage.length){
      loading.dismiss();
      super.showToast(this.toastCtrl, "图片上传成功。");

    }else{
      var targetPath = this.lastImage[this.arryNum]; //获取要上传的图片的地址
      this.arryNum ++;

      var url = 'http://192.168.1.170:9501/app/feedBack'; //图片要上传到的API接口

      var filename = new Date().getTime() + ".jpg"; //定义上传后的文件名
      //fileTransfer 上传的参数
      var options = {
        fileKey: "photo",
        fileName: filename,
        chunkedMode: false,
        mimeType: "multipart/form-data",
      };

      //开始正式地上传
      const fileTransfer: FileTransferObject = this.transfer.create();
      fileTransfer.upload(targetPath, url, options).then(data => {
        // console.log("图片上传成功返回的data"+JSON.stringify(data))
        this.uploadImagesFunction(loading);
      }, err => {
        // console.log("图片上传失败返回的err"+err)
        super.showToast(this.toastCtrl, "图片上传发生错误，请重试。");
      });

    }
  }

}
