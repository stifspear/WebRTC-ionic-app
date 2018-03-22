import { Http } from "@angular/http/src/http";
import { Events } from "ionic-angular/util/events";
import { PeerConnectionsProvider } from "../../providers/peer-connections/peer-connections";

export class Participant {
    name: string;
    http: Http;
    audioFlag:boolean;
    videoFlag: boolean;
    senderPeer: RTCPeerConnection;
    peerConnect: PeerConnectionsProvider;
    participantState: any;
    stream: MediaStream;
    screenStream: MediaStream;
    constructor(owner: string, name: string,public event: Events,
        configuration: any, public updateZone: any) {
        this.name = name;
        this.peerConnect = new PeerConnectionsProvider(configuration);
        this.participantState = {owner: owner, audio:false, video:false, screen:""};
    }
        
    createPeers(stream) {
        console.log("Create peers entered participant");
        this.peerConnect.createPeers();
        this.addStream(stream);
        this.peerConnect.addcall = this.onaddstream.bind(this);
        this.peerConnect.icecall = this.oniccandidate.bind(this);
        this.peerConnect.changecall = this.onicecandidatestatechange.bind(this);
        /*this.peerConnect.senderPeer.onicecandidate = this.oniccandidate.bind(this);
        this.peerConnect.senderPeer.onaddstream = this.onaddstream.bind(this);
        this.peerConnect.senderPeer.oniceconnectionstatechange = this.onicecandidatestatechange.bind(this);*/
    }
    oniccandidate(event: any) {
        console.log("onicecandidate", event);
        if(event.candidate) {
            var message = {
                id: 'iceCandidate',
                candidate: event.candidate,
                sender: this.name
            };
            this.event.publish('peer_msg',message);
        }
    }
    onaddstream(event: any) {
        console.log("onaddstream", event);
        console.log(this.participantState);
        console.log(this.stream);
        if(this.participantState.screen === event.stream.id) {
            console.log("onaddstreamif ");
            this.screenStream = event.stream;
            this.updateZone();
        } else {
            console.log("stream added");
            this.stream = event.stream;
            this.updateZone();
        }
        this.updateZone();
    }
    onremovestream(event: any) {
        console.log("onremovestream", event);
        if(event.stream.id === this.participantState.screen) {
            this.screenStream = undefined;
        } else {
            this.stream = undefined;
        }
    }
    onicecandidatestatechange(event: any) {
        console.log("ice candidate state changed to ",event.state);
    }
    /*
    If message is of type answer then set it as remote description or call create answer
    to reply to offer.
    */
    setSdp(message:any, state: any) {
        console.log("Set sdp participnat ", state);
        console.log("message", message);
        if(message.sdp.type === "answer") {
            this.peerConnect.setRemoteDesc(message.sdp);
        } else {
            this.peerConnect.createAnswer(message.sdp)
            .then(sdp=> {
                let msg = {
                    id:"sdp",
                    sender:this.name,
                    participantState:state,
                    sdp:sdp
                };
                this.event.publish('peer_msg',msg);
            }).catch(err=> {console.log(err)});
        }
    }
    setLocalStream(stream) {
        console.log("Set local stream participant");
        //stream.getTracks().forEach(track =>this.peerConnect.senderPeer.addTrack(track,this.stream));
        this.stream = stream;
    }
    setScreenStream(stream) {
        console.log("Setting screen stream on new participants");
        this.screenStream = stream;
        console.log(this.participantState);
        this.participantState.screen= stream.id;
        console.log(this.participantState);
    }
    dispose() {
        console.log("dispose participants");
        if(this.peerConnect.senderPeer != null) {
            this.peerConnect.onRemoveStream(this.onremovestream.bind(this));
            //this.peerConnect.senderPeer.removeStream();
        }
    }
    /*generateSdp() {
        console.log("generate sdp participants");
        this.peerConnect.generateSdp();
    }*/
    generateSdp(state) {
        console.log("generate sdp participants");
        this.peerConnect.generateSdp().
        then(sdp=> {
            let msg = {
                id: "sdp",
                sender: this.name,
                participantState: state,
                sdp: sdp
            };
            this.event.publish('peer_msg',msg);
        }).catch(err=>{console.log(err)});
    }
    addIceCandidate(candidate: any) {
        console.log("addicecandidate");
        this.peerConnect.addIceCandidate(candidate);
    }
    getLocalStream() {
        console.log("Local stream is called");
        return this.stream;
    }
    addStream(stream: MediaStream) {
        console.log("Stream Added");
        console.log(this.peerConnect.senderPeer);
        this.peerConnect.senderPeer.addStream(stream);
        //stream.getTracks().forEach(track => this.peerConnect.senderPeer.addTrack(track,stream));
    }
    removeStream(stream: any) {
        console.log('remove stream')
        console.log(this.peerConnect.senderPeer);
        this.peerConnect.senderPeer.removeStream(stream);
        //stream.getTracks().forEach(track => this.peerConnect.senderPeer.addTrack(track,stream));
    }
    getScreenStream() {
        console.log("Share screen stream");
        return this.screenStream;
    }
}