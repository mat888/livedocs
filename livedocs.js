const ModTemplate = require('../../lib/templates/modtemplate');
const Livedocs_Ui = require('./lib/main');
const PeerService = require("saito-js/lib/peer_service").default;

class Livedocs extends ModTemplate {
	constructor(app) {
		super(app);
		this.app = app;
		this.name = "Livedocs";
		this.livedocs_ui = new Livedocs_Ui(this.app, this, "");
		return this;
	}
	async installModule(app) {
		//
		// make sure modTemplate can add any hooks its needs for database support, etc.
		//
		await super.installModule(app);
		//
		// add the publickey for the graffiti module to our keychain as a "watched" address
		//
		// nb: because we do this on "install" which happens before the network is up, we 
		// do not need to call app.network.propagateKeylist() to update any peers, because
		// we have not yet connected to any peers and informed them of our keylist.
		//
		//		this.app.keychain.addKey(this.appPubKey, {watched: true});
	}
	async render(app) {
		await super.render(app);
		this.livedocs_ui.attachEvents();

		let userPubKey = this.publicKey;
		document.getElementById("pubKey").innerHTML = userPubKey;
		document.getElementById("recipient").value  = userPubKey;
		document.getElementById("peer-recipient").value  = userPubKey;
	}

	returnServices() {
		let services = [];
		// servers with chat service run plaintext community chat groups
		if (this.app.BROWSER == 0) {
			services.push(new PeerService(null, "test_request", "request/service description?"));
		}
		return services;
	}

	async sendTx(recipient=this.publicKey, msg_data="") {
		let newtx = await this.app.wallet.createUnsignedTransaction(recipient);
		newtx.msg.data = msg_data;
		newtx.msg.module = this.name; // this.name == "Livedocs"

		await newtx.sign();
		this.app.network.propagateTransaction(newtx);
	}

	async onConfirmation(blk, tx, conf) {

		// conf refers to the number of confirmations a transaction has
		// 0 confs occurs during the first block the transaction is included in

		// this function only continues if on the first confirmation
		console.log(tx);
		if (conf > 0) { return; }

		// 
		if (this.app.BROWSER) {
			let txmsg = tx.returnMessage();
			let sender = tx.from[0].publicKey;
			//		document.getElementById("onConf").innerHTML = JSON.stringify(txmsg);
			this.livedocs_ui.insertDOM("onConf", JSON.stringify(txmsg));
			console.log("onConfirmation ----------------------------------------- ", tx, sender);
		}

		this.app.connection.on("livedocs-mod-emit", () => {console.log("\n\n emitted \n\n") });
		let mod = this.app.modules.returnModule("Livedocs");
	}


	sendRelayMessage(recipient=null, data="") {
		/*
		await this.app.network.sendRequestAsTransaction(message="place test req", "data");
		console.log(this);
		*/
		this.app.connection.emit("relay-send-message", {
			recipient,
			request: "livedocs request",
			data: data
		});

	}

	async handlePeerTransaction(app, tx=null, peer, callback=null) {
		if (!tx.returnMessage().request == "livedocs request") {
			return;
		}
		if (this.app.BROWSER) {
			let payload =  tx.returnMessage();
			console.log(" == handlepeer == \n", payload);
			console.log(payload.data);

			let message = payload.data.message;
			console.log(message);

			if (payload.data.encrypted) {
				console.log("encrypted message detected");
				let sender = tx.from[0].publicKey;
				let decrypted = this.app.keychain.decryptMessage(sender, message);
				message = decrypted;
				console.log("sender: ", sender, " decrypted: ", decrypted);
				console.log("keychain: ", this.app.keychain);
			}
			this.livedocs_ui.insertDOM("handlePeer_output", message);
		}
	}

	keyExchange(publicKey) {
		let encrypt_mod = this.app.modules.returnModule("Encrypt");
		encrypt_mod.initiate_key_exchange(publicKey);
		console.log(this.app.keychain);
	}

	encryptedMessage(publicKey, message="test_enc_message") {
		let encrypted_data = this.app.keychain.encryptMessage(publicKey, message);
		let payload = {};
		console.log(this.app.keychain);
		payload.encrypted = true;
		payload.message = encrypted_data;
		this.sendRelayMessage(publicKey, payload);
	}
	/*
	async handlePeerTransaction(app, tx=null, peer, callback=null) {
		console.log("HANDLE PEER TX _______________");
		console.log(tx.returnMessage().request);

		if (tx.returnMessage().request != "livedocs test req") {
			return;
		}
		console.log("handlePeerTransaction = = = = = = = = \n");
		console.log(tx.returnMessage());
		console.log("tx is from: ", tx.from[0].publicKey);
		console.log("tx is to  : ", tx.to[0].publicKey);
		let recipient = tx.to[0].publicKey;

		let p = await this.app.network.getPeers();
		console.log("peers; ");
		let pks = [];
		for (let i = 0; i < p.length; i++) {
			console.log(p[i].publicKey);
			console.log(p[i].peerIndex);
			pks.push(p[i].publicKey);
		}

		if (this.app.BROWSER == false) {
			//console.log(peer.publicKey);
			// this needs a peer index, so presumably there is a global peer list it uses
			await this.app.network.sendRequestAsTransaction("msg2peer", "data2peer", null, p[0].peerIndex);
			console.log("sending from this client");

//	await this.app.network.sendRequest("network sending request", pks, null, p[0].peerIndex);
		}
		console.log(" = = = = = = = = = = = = = = = = = = = ");
	}
	async encryptedMessage(publicKey, message="test_enc_message") {
		let newtx = await this.app.wallet.createUnsignedTransaction(publicKey);
		newtx.msg.data = message;
		newtx.msg.module = this.name;
		newtx.msg.request = "enc_msg";

		newtx = await this.app.wallet.signAndEncryptTransaction(newtx, publicKey);
		this.app.network.propagateTransaction(newtx);
	}

*/
}

module.exports = Livedocs;
