import { WebsocketServiceProvider } from './../../providers/websocket-service/websocket-service';
import { DisplayPage } from './../display/display';
import { Component, ViewChild } from '@angular/core';
import { NavController, AlertController } from 'ionic-angular';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  //Gets the first element matching the selector username and password
  @ViewChild('username') uname;
  @ViewChild('room') room;
  constructor(public navCtrl: NavController,
    public alertCtrl: AlertController,
    public webSocket: WebsocketServiceProvider) {
    //Uncomment for Automated login
    // this.autoLogin();
  }
  join() {
    console.log(this.uname.value, this.room.value);
    console.log("Display push");
    //console.log(this.webSocket.x);
    this.navCtrl.push(DisplayPage, {
      username: this.uname.value,
      room: this.room.value
    }).catch((err) => console.log(err));
  }
  autoLogin() {
    this.navCtrl.push(DisplayPage, {
      username: new Date(),
      room: "Test"
    });
  }
}