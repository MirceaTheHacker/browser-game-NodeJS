var initPack = { player: [], bullet: [], upgrade: [] };
var removePack = { player: [], bullet: [], upgrade: [] };

Entity = function (param) {
  var self = {
    x: 250,
    y: 250,
    spdX: 0,
    spdY: 0,
    id: "",
    map: null,
  };
  if (param) {
    if (param.x) self.x = param.x;
    if (param.y) self.y = param.y;
    if (param.map) self.map = param.map;
    if (param.id) self.id = param.id;
  }

  self.update = function () {
    self.updatePosition();
  };
  self.updatePosition = function () {
    self.x += self.spdX;
    self.y += self.spdY;
  };
  self.getDistance = function (pt) {
    return Math.sqrt(Math.pow(self.x - pt.x, 2) + Math.pow(self.y - pt.y, 2));
  };
  self.isColliding = function (entity2) {
    if (self.map === entity2.map && self.getDistance(entity2) < 32) {
      return true;
    } else {
      return false;
    }
  };
  return self;
};
Entity.getFrameUpdateData = function () {
  var pack = {
    initPack: {
      player: initPack.player,
      bullet: initPack.bullet,
      upgrade: initPack.upgrade,
    },
    removePack: {
      player: removePack.player,
      bullet: removePack.bullet,
      upgrade: removePack.upgrade,
    },
    updatePack: {
      player: Player.update(),
      bullet: Bullet.update(),
      upgrade: Upgrade.update(),
    },
  };
  initPack.player = [];
  initPack.bullet = [];
  initPack.upgrade = [];
  removePack.player = [];
  removePack.bullet = [];
  removePack.upgrade = [];
  return pack;
};

Player = function (param) {
  var self = Entity(param);
  self.number = "" + Math.floor(10 * Math.random());
  self.username = param.username;
  self.pressingRight = false;
  self.pressingLeft = false;
  self.pressingUp = false;
  self.pressingDown = false;
  self.pressingAttack = false;
  self.mouseAngle = 0;
  self.maxSpd = 10;
  self.hp = 10;
  self.hpMax = 10;
  self.score = 0;
  self.inventory = new Inventory(param.progress.items, param.socket, true);
  self.socket = param.socket;
  self.atkSpd = 10;
  self.attackCounter = 0;

  var super_update = self.update;
  self.update = function () {
    self.updateSpd();
    super_update();

    self.attackCounter += self.atkSpd;

    if (self.pressingAttack && self.attackCounter > 250) {
      // 1 per sec def
      self.attackCounter = 0;
      self.shootBullet(self.mouseAngle);
    }
  };
  self.shootBullet = function (angle) {
    if (Math.random() < 0.1) self.inventory.addItem("potion", 1);
    Bullet({
      parent: self.id,
      angle: angle,
      x: self.x,
      y: self.y,
      map: self.map,
    });
  };

  self.updateSpd = function () {
    if (self.pressingRight) self.spdX = self.maxSpd;
    else if (self.pressingLeft) self.spdX = -self.maxSpd;
    else self.spdX = 0;

    if (self.pressingUp) self.spdY = -self.maxSpd;
    else if (self.pressingDown) self.spdY = self.maxSpd;
    else self.spdY = 0;
  };

  self.getInitPack = function () {
    return {
      id: self.id,
      x: self.x,
      y: self.y,
      number: self.number,
      hp: self.hp,
      hpMax: self.hpMax,
      score: self.score,
      map: self.map,
      atkSpd: self.atkSpd,
    };
  };
  self.getUpdatePack = function () {
    return {
      id: self.id,
      x: self.x,
      y: self.y,
      hp: self.hp,
      score: self.score,
      map: self.map,
      atkSpd: self.atkSpd,
    };
  };

  Player.list[self.id] = self;
  initPack.player.push(self.getInitPack());
  return self;
};

Player.onConnect = function (socket, username, progress) {
  var map = Maps.getRandomMap();
  var player = Player({
    username: username,
    id: socket.id,
    map: map,
    socket: socket,
    progress: progress,
  });
  player.inventory.refreshRender();

  socket.on("keyPress", function (data) {
    if (data.inputId === "left") player.pressingLeft = data.state;
    else if (data.inputId === "right") player.pressingRight = data.state;
    else if (data.inputId === "up") player.pressingUp = data.state;
    else if (data.inputId === "down") player.pressingDown = data.state;
    else if (data.inputId === "attack") player.pressingAttack = data.state;
    else if (data.inputId === "mouseAngle") player.mouseAngle = data.state;
  });

  socket.on("changeMap", function (data) {
    if (player.map.id === "field") player.map = Maps.list['forest'];
    else Maps.list['field'];
  });

  socket.on("sendMsgToServer", function (data) {
    for (var i in Player.list) {
      Player.list[i].socket.emit("addToChat", player.username + ": " + data);
    }
  });
  socket.on("sendPmToServer", function (data) {
    //data:{username,message}
    var recipientSocket = null;
    for (var i in Player.list)
      if (Player.list[i].username === data.username)
        recipientSocket = Player.list[i].socket;
    if (recipientSocket === null) {
      socket.emit(
        "addToChat",
        "The player " + data.username + " is not online."
      );
    } else {
      recipientSocket.emit(
        "addToChat",
        "From " + player.username + ":" + data.message
      );
      socket.emit("addToChat", "To " + data.username + ":" + data.message);
    }
  });

  socket.emit("init", {
    selfId: socket.id,
    player: Player.getAllInitPack(),
    bullet: Bullet.getAllInitPack(),
    upgrade: Upgrade.getAllInitPack(),
  });
};
Player.getAllInitPack = function () {
  var players = [];
  for (var i in Player.list) players.push(Player.list[i].getInitPack());
  return players;
};

Player.onDisconnect = function (socket) {
  var player = Player.list[socket.id];
  if (!player) return;
  Database.savePlayerProgress({
    username: player.username,
    items: player.inventory.items,
  });
  delete Player.list[socket.id];
  removePack.player.push(socket.id);
};
Player.update = function () {
  var pack = [];
  for (var i in Player.list) {
    var player = Player.list[i];
    player.update();
    pack.push(player.getUpdatePack());
  }
  return pack;
};

Bullet = function (param) {
  var self = Entity(param);
  self.id = Math.random();
  self.angle = param.angle;
  self.spdX = Math.cos((param.angle / 180) * Math.PI) * 10;
  self.spdY = Math.sin((param.angle / 180) * Math.PI) * 10;
  self.parent = param.parent;

  self.timer = 0;
  self.toRemove = false;
  var super_update = self.update;
  self.update = function () {
    if (self.timer++ > 100) self.toRemove = true;
    super_update();

    for (var i in Player.list) {
      var p = Player.list[i];
      if (self.isColliding(p) && self.parent !== p.id) {
        p.hp -= 1;

        if (p.hp <= 0) {
          var shooter = Player.list[self.parent];
          if (shooter) shooter.score += 1;
          p.hp = p.hpMax;
          p.x = Math.random() * 500;
          p.y = Math.random() * 500;
        }
        self.toRemove = true;
      }
    }
  };
  self.getInitPack = function () {
    return {
      id: self.id,
      x: self.x,
      y: self.y,
      map: self.map,
    };
  };
  self.getUpdatePack = function () {
    return {
      id: self.id,
      x: self.x,
      y: self.y,
    };
  };

  Bullet.list[self.id] = self;
  initPack.bullet.push(self.getInitPack());
  return self;
};

Bullet.update = function () {
  var pack = [];
  for (var i in Bullet.list) {
    var bullet = Bullet.list[i];
    bullet.update();
    if (bullet.toRemove) {
      delete Bullet.list[i];
      removePack.bullet.push(bullet.id);
    } else pack.push(bullet.getUpdatePack());
  }
  return pack;
};

Bullet.getAllInitPack = function () {
  var bullets = [];
  for (var i in Bullet.list) bullets.push(Bullet.list[i].getInitPack());
  return bullets;
};

Upgrade = function (param) {
  var self = Entity(param);
  self.category = param.category;

  self.getUpdatePack = function () {
    return {
      id: self.id,
      x: self.x,
      y: self.y,
      category: self.category,
    };
  };

  var super_update = self.update;
  self.update = function () {
    super_update();
    for (var i in Player.list) {
      var player = Player.list[i];
      if (self.isColliding(player)) {
        if (self.category === "score") player.score += 1;
        if (self.category === "atkSpd") player.atkSpd += 1;
        delete Upgrade.list[self.id];
        removePack.upgrade.push(self.id);
      }
    }
  };

  self.getInitPack = function () {
    return {
      id: self.id,
      x: self.x,
      y: self.y,
      map: self.map,
      category: self.category,
    };
  };

  Upgrade.list[self.id] = self;
  initPack.upgrade.push(self.getInitPack());
};

Upgrade.update = function () {
  var pack = [];
  for (var i in Upgrade.list) {
    var upgrade = Upgrade.list[i];
    upgrade.update();
    if (upgrade.toRemove) {
      delete Upgrade.list[i];
      removePack.upgrade.push(upgrade.id);
    } else {
      pack.push(upgrade.getUpdatePack());
    }
  }

  return pack;
};

Upgrade.getAllInitPack = function () {
  var upgrades = [];
  for (var i in Upgrade.list) upgrades.push(Upgrade.list[i].getInitPack());
  return upgrades;
};

Player.list = {};
Bullet.list = {};
Upgrade.list = {};