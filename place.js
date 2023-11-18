const ModTemplate = require('../../lib/templates/modtemplate');
const PeerService = require("saito-js/lib/peer_service").default;
const PlaceUI     = require('./lib/place-ui');
const GridState   = require('./lib/grid-state');
const createHash  = require('crypto').createHash;


class Place extends ModTemplate {
  constructor(app) {
    super(app);
    this.name = "Place";

    this.gridSize = 40;

    this.gridState = new GridState(this);
    this.placeUI   = new PlaceUI(this);
  }

  returnServices() {
    return [new PeerService(null, "place", "place tilegrid")];
  }

  async render(app) {
    if (!this.app.BROWSER) {
      return;
    }
    await super.render(app);
    this.placeUI.render();
  }

  async onPeerServiceUp(app, peer, service={}) {
    if (!this.browser_active) {
      return;
    }
    if (service.service === "place") {
      this.loadTilegridFromPeer(peer);
    }
  }

  loadTilegridFromPeer(peer) {
    const sql = "SELECT * FROM tiles";
    this.sendPeerDatabaseRequestWithFilter(this.name, sql, async (res) => {
      if (res.rows) {
        res.rows.forEach((row) => {
          this.updateTile(
            {i: row.i, j: row.j, color: this.componentsToColor([row.red, row.green, row.blue])},
            "confirmed", row.ordinal
          );
        });
      }
    });
  }

  async onConfirmation(blk, tx, conf) {
    console.log("*+* BEGIN Place.onConfirmation: ");
    let txmsg = tx.returnMessage();
    try {
      if (conf == 0) {
        if (txmsg.request === "paint") {
          this.receivePaintingTransaction(tx);
        }
      }
    } catch (err) {
      console.error("In" + this.name + ".onConfirmation: " + err);
    }
  }

  async sendPaintingTransaction(paintedTiles) {
    console.log("*+* Sending painting transaction: ", paintedTiles);
    let newtx = await this.app.wallet.createUnsignedTransaction();
    newtx.msg = {module: this.name, request: "paint", data: paintedTiles};
    await newtx.sign();
    await this.app.network.propagateTransaction(newtx);
    return this.transactionOrdinal(newtx);
  }

  receivePaintingTransaction(tx) {
    console.log("*+* Received painting transaction");
    const txOrdinal = this.transactionOrdinal(tx);
    for (tile of tx.returnMessage().data) {
      this.updateTile(tile, "confirmed", txOrdinal);
    }
  }

  // orders transactions in case and they have tiles in common and timestamps are equal
  transactionOrdinal(tx) {
    const orderPrecision = 10**6;
    const sigHash = parseInt(createHash("md5").update(tx.signature).digest("hex"), 16) % orderPrecision;
    return tx.timestamp * orderPrecision + sigHash;
  }

  updateTile(tile, status, ordinal=null) {
    const [i, j, updatedTileState] = this.gridState.updateTile(tile, status, ordinal);
    if (this.app.BROWSER) {
      this.placeUI.updateTileRendering(i, j, updatedTileState);
    } else if (status === "confirmed") {
      const sql = `UPDATE tiles
                   SET red = $red, green = $green, blue = $blue, ordinal = $ordinal
                   WHERE i = $i AND j = $j`;
      const components = this.colorToComponents(updatedTileState.confirmed.color);
      const params = {
        $red: components[0], $green: components[1], $blue: components[2], $ordinal: ordinal,
        $i: i, $j: j
      };
      this.app.storage.executeDatabase(sql, params, "place");
    }
  }

  colorToComponents(color) {
    const hexComponents = [0, 1, 2].map(k => color.substring(2*k+1, 2*k+3));
    return hexComponents.map(hex => parseInt(hex, 16));
  }

  componentsToColor(components) {
    const hexComponents = components.map(c => ((c < 16) ? "0" : "") + c.toString(16));
    return "#" + hexComponents.reduce((strAcc, str) => strAcc + str, "");
  }
}

module.exports = Place;