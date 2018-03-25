import { Mod } from './mod';
import { WebsocketServiceProvider } from './../../providers/websocket-service/websocket-service';
import { NavController, NavParams } from 'ionic-angular';
import { Component, NgZone } from '@angular/core';
import { Http, Headers } from '@angular/http';
import { Response } from '@angular/http/src/static_response';
import { MediaProvider } from './../../providers/media/media';
import { Participant } from './participant';
import { Events } from 'ionic-angular';
import { ConfigurationProvider } from '../../providers/configuration/configuration';

/**
 * Generated class for the DisplayPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@Component({
  selector: 'page-display',
  templateUrl: 'display.html'
})
export class DisplayPage {
  //const AUDIO = "audio";
  username: string;
  currentCameraId: string;
  screenColor: string;
  room: string;
  toggleShareScreen: boolean;
  ws: WebsocketServiceProvider;
  shareFlag: boolean;
  chrome: any;                          //Used in screen share operation.
  participants = {};
  configuration: any;                   //Configurations of turn and stun server for ICE
  headers: Headers;                     //Http header
  bigVid: MediaStream;                  //Used to set one of the participants videos as main video
  objectKeys = Object.keys;
  messageArray: [{ name: string, msg: string }];
  //Audio and video toggle constrains
  audio: { type: string, audio: boolean, video: boolean, flag: boolean, color: string};
  video: { type: string, audio: boolean, video: boolean, flag: boolean, color: string};
  private mod: Mod;
  url = "https://global.xirsys.net/_turn/ionicweb-call/"

  constructor(public navCtrl: NavController, public navParams: NavParams,
    private zone: NgZone,
    private http: Http,
    private webSocket: WebsocketServiceProvider,
    private mediaProvider: MediaProvider,
    private events: Events,
    private configProvider: ConfigurationProvider) {
    this.ws = webSocket;
    this.username = navParams.get("username");
    this.room = navParams.get("room");
    this.audio = { type: "audio", audio: true, video: false, flag: true, color: 'grey'};
    this.video = { type: "video", audio: false, video: true, flag: true, color: 'grey' };
    this.configuration = configProvider.configuration;
    this.headers = configProvider.headers;
    this.messageArray = [{ name: "", msg: "" }];
    this.toggleShareScreen = false;
    this.screenColor = 'grey';


    events.subscribe('existingParticipants', message => {
      console.log("Entered");
      console.log(message);
      this.onExistingParticipants(message);
    });
    events.subscribe('sdp', message => {
      this.handleSdp(message);
    });
    events.subscribe('newParticipantArrived', message => {
      this.onNewParticipant(message);
    });
    events.subscribe('participantLeft', message => {
      this.onParticipantLeft(message);
    });
    events.subscribe('existingChat', message => {
      console.log('Previous chat push operation');
      this.pushMessage(message.data);
    });
    events.subscribe('msg', parsedMessage => {
      this.messageArray.push(parsedMessage);
      //this.messageArray.push({name: JSON.parse(parsedMessage.data).user, msg: JSON.parse(parsedMessage.data).message});

    });
    events.subscribe('iceCandidate', message => {
      this.participants[message.sender].addIceCandidate(message.candidate);
    });
    events.subscribe('peer_msg', msg => {
      this.ws.sendMessage(msg);
    });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad DisplayPage');
    this.http.put(this.url, "sdsd", { headers: this.headers }).subscribe((res: Response) => {
      console.log("ICE List: ", res.json().v.iceServers);
      this.configuration.iceServers = res.json().v.iceServers.concat(this.configuration.iceServers);
      console.log('configuration', this.configuration);
    });

    this.register(this.username, this.room);
  }
  register(name, room) {
    this.username = name;
    this.room = room;

    console.log("hello " + this.username + this.room);

    var message = {
      id: 'joinRoom',
      name: name,
      room: room,
    }
    this.ws.sendMessage(message);

  }
  /*
  Disable the media. Remove stream then updage sdp;
  */
  toggleVideo() {
    this.video = this.toggleMedia(this.video);
    this.participants[this.username].videoFlag = !this.participants[this.username].videoFlag;
  }
  toggleAudio() {
    this.audio = this.toggleMedia(this.audio);
    this.participants[this.username].audioFlag = !this.participants[this.username].audioFlag;
  }
  toggleMedia(option) {
    if (option.flag) {
      console.log(option);
      console.log(option.type + " toggle if");
      let stream = this.participants[this.username].getLocalStream();
      stream = this.mediaProvider.removeMediaTracks(option.type, stream);
      this.participants[this.username].setLocalStream(stream);
      this.setParticipantState(stream, this.mediaProvider.getConstraints(stream));

      for (let key in this.participants) {
        if (key != this.username) {
          this.participants[key].generateSdp(this.participants[this.username].participantState);
          this.updateZone();
        }
      }
      option.color = 'red';
    } else {
      console.log("else");
      this.mediaProvider.getMedia({ audio: option.audio, video: option.video })
        .then(curstream => {
          let stream = this.participants[this.username].getLocalStream();
          stream = this.mediaProvider.addMediaTracks(option.type, stream, this.mediaProvider.getMediaTracks(option.type, curstream)[0]);
          this.setParticipantState(stream, this.mediaProvider.getConstraints(stream));
          for (let key in this.participants) {
            if (key != this.username) {
              this.participants[key].generateSdp(this.participants[this.username].participantState);
              this.updateZone();
            }
          }
          option.color = 'grey';
        }).catch(err => { console.log(err) });
    }
    option.flag = !option.flag;
    return option;
  }

  /*
  End call button
  */
  endCall() {
    console.log("End call button pressed");
    this.leaveRoom();
  }
  /*
  Whenever a new participant joins
  Below two function is called when a new participant is created. Function is called on the 
  existing participant side for every new participant. Eg if p1 is existing participant and p2 joins.
  Then below function will be called on p1 side.
  Below function will be called for every existing participant from the websocket(backend).
  So every existing participant will receive the video from this.participant.
  */
  onNewParticipant(request) {
    console.log("newparticipantarrived");
    this.receiveVideo(request.name);
  }
  //sender is new participant in the room 
  //this.username is present participant
  receiveVideo(sender) {
    console.log("Entered receive video ", sender);

    console.log(this.username, " ", sender);
    var participant = new Participant(this.username, sender, this.events, this.configuration, this.updateZone.bind(this));
    this.participants[sender] = participant;
    //console.log(this.participants[this.username].participantState);
    participant.createPeers(this.participants[this.username].getLocalStream());
    let screenStream = this.participants[this.username].getScreenStream();
    //console.log("screenstream",screenStream);
    if (screenStream) {
      participant.addStream(screenStream);
    }
    console.log("Exit receive video");
    this.updateZone();
  }

  /*
  When a new participant joins, function will create an answer or will setremotedescription if it is of type answer.
  When someone new joins it will create an offer for all the participants. And will get the answer back.
  */

  handleSdp(result) {
    console.info("handlesdp ", result);
    this.participants[result.sender].participantState = Object.assign(this.participants[result.sender].participantState, result.participantState);
    //pass current state of the answerer from participants layer
    console.log(result);
    this.participants[result.sender].setSdp(result, this.getLocalState());
  }
  /*
  pip-video(small video) is set as main(large) video
  */
  changeVideo(stream: MediaStream) {
    console.log("previous video ",this.bigVid);
    this.bigVid = stream;
    console.log("stream ",stream);
    console.log("changed video ",this.bigVid);
    this.updateZone();
  }
  leaveRoom() {
    if (window.confirm("Are you sure you want to leave") == true) {
      this.ws.sendMessage({
        id: 'leaveRoom'
      });
      console.log(this.participants, ' left the room');

      this.ws.close();
      location.reload();
    }
  }
  /*
  Function is called whenever a new user joins a room. Local stream is set. Called on the new participant side.
  If p1 is a new participant below function will be called on his side.
  Remote stream is set for all the existing users.
  */
  onExistingParticipants(msg) {
    var constraints = {
      audio: true,
      video: true
    };
    console.log(this.username + " registered in room " + this.room);
    this.updateZone();
    console.log(this.configuration);
    let participant = new Participant(this.username, this.username, this.events, this.configuration, this.updateZone.bind(this));
    this.participants[this.username] = participant;
    let that = this;
    this.mediaProvider.getMedia(this.mediaProvider.vgaConstraints).then(function (stream) {
      console.log('video received');
      this.bigVid = stream;
      console.log("localstream ", stream);
      //console.log(this.mediaProvider.getMediaTracks("video",stream)[0].getSettings());
      participant.setLocalStream(stream);
      this.setParticipantState(stream, constraints);
      //this.setCameraId();
      that.updateZone();
      console.log("msgdata", msg.data);
      for (let participant in msg.data) {
        //participant is the key of values in msg.data & msg.data[participant] gets the exact participant
        this.receiveVideoAndGenerateSdp(msg.data[participant]);
      }
      //msg.data.forEach(this.receiveVideoAndGenerateSdp.bind(this));
      console.log(msg.data);
      msg.data.forEach(function (d) {
        console.log(d);
      });
    }.bind(this)).catch(function (err) {
      console.log("error", err);
    });
  }
  /*
  Below function is called for every particpant whenever new participant joins
  Sender is one of the existing participant. this.username is new participant.
  Below function is called on new participant side.
  */
  receiveVideoAndGenerateSdp(sender) {
    console.info('receiveVideoandGenerateSdp');
    console.log(this.username, " ", sender);
    let participant = new Participant(this.username, sender, this.events, this.configuration, this.updateZone.bind(this));
    this.participants[sender] = participant;
    participant.createPeers(this.participants[this.username].getLocalStream());
    //Pass current state of the offerer
    //this.participants[sender].generateSdp();
    this.participants[sender].generateSdp(this.participants[this.username].participantState);
    console.log(this.participants);
  }

  onParticipantLeft(request) {
    console.log('Participant ' + request.name + ' left');
    let participant = this.participants[request.name];
    console.log(this.participants[request.name]);
    if (participant != null)
      participant.dispose();
    delete this.participants[request.name];
  }

  onSubmit(message: String) {
    this.ws.sendMessage(JSON.stringify({ message: message, room: this.room, type: "msg", user: this.username }));
  }

  // Will force update a component in case of asynchronous activity;

  updateZone() {
    this.zone.run(() => console.info("forcing view update"));
  }
  shareScreen() {
    this.mod = new Mod();
    //Initially share screen is off
    if (!this.toggleShareScreen) {      this.mod.nativeWindow.chrome.runtime.sendMessage('dpgmddfhghbhhldcbjeednoklomllaem', {
        getTargetData: true,
        sources: ['screen', 'window', 'tab']
      }, (response: any) => {
        let constraints = this.mediaProvider.getScreenConstraints(response.streamId);
        console.log("constraints taken", constraints);
        this.mediaProvider.getMedia(constraints)
          .then(screenStream => {
            console.log("screen stream for", this.username, screenStream);
            this.participants[this.username].setScreenStream(screenStream);
            console.log(this.participants[this.username]);
            for (var key in this.participants) {
                if (key != this.username) {
                console.log(this.participants[key]);
                //this.participants[key].zone(this.updateZone.bind(this));
                this.participants[key].peerConnect.updateZone = this.updateZone;
                this.participants[key].addStream(screenStream);
                //this.participants[key].addStream(screenStream);
                this.participants[key].generateSdp(this.participants[this.username].participantState);
                console.log(this.participants[key]);
              }
            };
              this.screenColor = '#0080ff';
              this.updateZone();
              console.log(this.screenColor);
            console.log(screenStream);
            screenStream.oninactive = () => {
              if(this.participants[this.username].participantState.screen!="") {
                console.log("oninacive");
                console.log(this.participants[this.username]);
                this.participants[this.username].participantState.screen = "";
                console.log(this.participants[this.username].participantState);
                for (var key in this.participants) {
                  if (key != this.username) {
                    this.updateZone();
                    console.log("Screen share closing");
                    this.participants[key].removeStream(screenStream);
                    this.participants[key].generateSdp(this.participants[this.username].participantState);
                  }
                }
                this.toggleShareScreen = !this.toggleShareScreen;
                this.screenColor = 'grey';
              } else {
                console.log("oninactiove was called but video already stopped");
              }
            }
          })
      });    
    } else {
      console.log("else share screen called");
      if (this.participants[this.username].screenStream) {
        this.screenColor = 'grey';
        console.log(this.participants[this.username]);
        this.participants[this.username].participantState.screen = "";
        console.log(this.participants[this.username]);
        for (let key in this.participants) {
          if (key != this.username) {
            this.updateZone();
            this.participants[key].removeStream(this.participants[this.username].screenStream);
            this.participants[key].generateSdp(this.participants[this.username].participantState);
          }
        }
        for(let track of this.mediaProvider.getTracks(this.participants[this.username].screenStream)) {
          console.log(track);
          
            track.stop();
        }
        this.participants[this.username].screenStream = undefined;
      } else {
        console.log("No stream fount");
      }
    }
    console.log(this.screenColor);
    this.toggleShareScreen = !this.toggleShareScreen;
  }
  //message will be emmited by child component
  //message is a promise which contains stream and camera device id
  onNotify(message: any) {
    console.log("changecamera");
    message.then(value => {
      this.currentCameraId = value.device;
      let local = this.participants[this.username].getLocalStream();
      local = this.mediaProvider.removeMediaTracks("video", local);
      this.participants[this.username].setLocalStream(local);
      local = this.mediaProvider.addMediaTracks("video", local, value.stream);
      for (let key in this.participants) {
        if (this.username != key) {
          this.participants[key].generateSdp();
        }
      }
    }).catch(err => console.log(err));
  }
  setCameraId() {
    this.currentCameraId = this.mediaProvider.getDeviceId("video", this.participants[this.username].getLocalStream());
    console.log("camera id:" + this.currentCameraId);
  }
  pushMessage(messageArr) {
    console.log("push message function");
    for (let entry of messageArr) {
      this.messageArray.push(entry);
    }
  }
  setParticipantState(stream, flag) {
    console.log("flag ", flag);
    //console.log(this.participants[this.username].participantState);
    this.participants[this.username].participantState.audio = flag.audio;
    this.participants[this.username].participantState.video = flag.video;
    //console.log(this.participants[this.username].participantState);
  }
  setParticipantScreenState(flag) {
    this.participants[this.username].participantState.screen = flag;
  }
  getLocalState() {
    return this.participants[this.username].participantState;
  }
  chooseStream(participant: Participant) {
    console.log("parti", participant);
    if (participant.participantState && participant.participantState.screen !== "") {
      return participant.screenStream;
    }
    return participant.stream;
  }
  isSame(str: string, str2: string) {
    return (str == str2);
  }
  notBlank(str: string) {
    if (str === "")
      return false;
    return true;
  }
  changeColor(mediaState: boolean) {
    if (mediaState) {
      return "secondary";
    }
    return "danger";
  }
  getVideoSrc(participant: Participant) {
    if (participant.participantState.video) {
      return participant.stream;
    }
    return null;
  }
}
