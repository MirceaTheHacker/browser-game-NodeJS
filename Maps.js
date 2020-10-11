Maps = function(id)
{
	var self = {
		id: id,
        width: 640 * 2,
        height: 480 * 2,
        upgradesCount: 0,
        upgradesMax: 3
    }	

    self.randomlyGenerateUpgrade = function()
    {
          //Math.random() returns a number between 0 and 1
        var upgrade = {
        x: Math.random() * self.width,
        y: Math.random() * self.height,
        id: Math.random(),
        map: self,
        };

        if (Math.random() < 0.5) {
            upgrade.category = "score";
          } else {
            upgrade.category = "atkSpd";
        }

        Upgrade(upgrade);
        self.upgradesCount++;
    }

    for (var i = 0; i < self.upgradesMax; i++)
    {
        self.randomlyGenerateUpgrade();
    }

    self.getInitPack = function () {
        return {
            name: self.name,
            size: 2
        };
    }

    Maps.list[self.id] = self;
    //initPack.maps.push(self.getInitPack());
}

Maps.list = {};
Maps('forest');
Maps('field');

Maps.getRandomMap = function()
{
    var mapsKeys = Object.keys(Maps.list);
    var randomKey = mapsKeys[Math.floor(Math.random() * mapsKeys.length)];
    return Maps.list[randomKey];
}

Maps.getAllInitPack = function () {
    var maps = [];
    for (var i in Maps.list) maps.push(Maps.list[i].getInitPack());
    return maps;
};

