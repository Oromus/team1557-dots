var updateInterval = 1000 / 20;
var assignTypes = true;
var dots = [];

/*
TODO LIST:

* Find/make a way to get a list/array of all the dots in a team.
* Once that ^ is done, fairly assign typed dots to all teams.
* Write a function that can decide if a team's color is too dark to interact well with black backgrounds/text/type icons.
* Fix stack overflow caused when two AIs with infected() functions that cause infections infect each other.
* Different AIs on a dot-by-dot basis (or type-by-type?) instead of team-by-team.

*/
function reset() {
	dots = [];
	start();
}

function move(dot, x, y) {
	if (x < 0 || y < 0 || x >= width || y >= height)
		return false;

	dot.x = x;
	dot.y = y;
	return true;
}

function kill(dot) {
	dots.splice(dots.indexOf(dot), 1);
}

function create(team, x, y) {
	x = Math.floor(x);
	y = Math.floor(y);
	if (x < 0)
		x = 0;
	if (y < 0)
		y = 0;
	if (x >= width)
		x = width-1;
	if (y >= height)
		y = height-1;
	var dot = {
		"oldTeam":	team,
		"team":		team,
		"x":		x,
		"y":		y,
		"oldX":		x,
		"oldY":		y,
		"age":		0
	};

	if (assignTypes) {
		if (random(1, 30) == 1) {
			var t = random(2, 2);
			if (t == 1) {
				dot.type = types.king;
			} else if (t == 2) {
				dot.type = types.shield;
			} else if (t == 3) {
				dot.type = types.nuke;
			} else if (t == 4) {
				dot.type = types.suicide;
			} else if (t == 5){
				dot.type == types.shapeshifter; //Isn't able to be picked because of graphical glitches related to its AI or image
			}
		}
	}

	if (team.spawn !== undefined) {
		team.spawn(dot);
	}
	dots.push(dot);
	move(dot, x, y);
	return dot;
}

function random(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

var cog = {x:0,y:0},
	teamCOG = {},
	teamCounts = {};
function aiTick() {
	var combinedX = 0,
		combinedY = 0,
		i = 0;
	teamCounts = {};
	teamCOG = {};
	dots.forEach(function(dot) {
		combinedX += dot.x;
		combinedY += dot.y;
		teamCounts[dot.team.name] = (teamCounts[dot.team.name] || 0) + 1;

		teamCOG[dot.team.name] = teamCOG[dot.team.name] || {"x":0,"y":0,"i":0,"totalX":0,"totalY":0};
		var teamcog = teamCOG[dot.team.name];
		teamcog.totalX += dot.x;
		teamcog.totalY += dot.y;
		teamcog.i++;
		teamcog.x = teamcog.totalX / teamcog.i;
		teamcog.y = teamcog.totalY / teamcog.i;

		i++;
	});
	cog.x = combinedX / i;
	cog.y = combinedY / i;
}

var ai = {
	/**
	 *  Infects a target to match the infector's team.
	 *  @returns
	 *  True if both dots exist.
	 */
	"infect": function (dot, target, dotWinOdds) {
		dotWinOdds = dotWinOdds || 1;
		if (dot !== undefined && target !== undefined) {
			if (target.team != dot.team) {
				if (Math.random() < dotWinOdds)
					setTeam(target, dot.team);
				else
					setTeam(dot, target.team);
			}
			return true;
		}
	},

	/**
	 *  Attacks a dot.
	 *  Dot win odds is a decimal from 0 to 1, where 1 is a certain victory and 0 is certain defeat.
	 *  @returns
	 *  Whether the attacker dot won.
	 */
	"attack": function (dot, target, dotWinOdds) {
		dotWinOdds = dotWinOdds || 1;
		if (dot !== undefined && target !== undefined) {
			if (Math.random() < dotWinOdds) {
				kill(target);
				return true;
			} else {
				kill(dot);
				return false;
			}
		}
	},

	/**
	 *  Tries to move to the given coordinates.
	 *  @returns
	 *  Whether we were able to move there.
	 *  False if occupied
	 */
	"move": function (dot, x, y) {
		var got = get(x, y);
		if (got === undefined) {
			move(dot, x, y);
			return true;
		} else if (dot.team == got.team && dot.type !== undefined && got.type === undefined) { //Allows typed dots to move around inside their own team
			if (dot.movedThroughTeam === undefined) dot.movedThroughTeam = false;
			if (!dot.movedThroughTeam) {
				move(got, dot.x, dot.y);
				move(dot, x, y);
				dot.movedThroughTeam = true;
				return true;
			} else {
				dot.movedThroughTeam = false;
				return false;
			}
		} else if (got.team != dot.team) {
			ai.infect(dot, got, 0.7);
		}
		return false;
	},

	/**
	 *  Tries to create a babby next to the pair.
	 *  The team is randomly chosen between the two with a 50% chance
	 */
	"breed": function (dot, target) {
		if (dot !== undefined && target !== undefined) {
			var team = dot.team;

			if (dot.team != target.team && Math.random() < 0.50) {
				team = target.team;
			}

			var newDot = create(team, dot.x, dot.y);
		}
	},

	"moveTowards": function (dot, pos, direction) {
		direction = direction || 1;
		var moved = false;
		if (dot.x < pos.x) {
			if (ai.move(dot, dot.x + direction, dot.y))
				moved = true;
		}
		if (dot.y < pos.y) {
			if (ai.move(dot, dot.x, dot.y + direction))
				moved = true;
		}
		if (dot.x > pos.x) {
			if (ai.move(dot, dot.x - direction, dot.y))
				moved = true;
		}
		if (dot.y > pos.y) {
			if (ai.move(dot, dot.x, dot.y - direction))
				moved = true;
		}
		return moved;
	},
	"moveAway": function (dot, pos) {
		return ai.moveTowards(dot, pos, -1);
	},
};

var tasks = {
	"reaper": function () {
		this.age += 1;
		if (teamCounts[this.team.name] > 1000) {
			if (this.age > 1000) {
				kill(this);
				teamCounts[this.team.name]--;
			}
		}
	},

	"wander": function () {
		var x = Math.round(random(-1, 1)),
			y = Math.round(random(-1, 1)),
			target = get(this.x + x, this.y + y);

		if (x === 0 && y === 0)
			return false;

		if (target !== undefined && this.team != target.team) {
			if (Math.random() < 0.50) {
				ai.infect(this, target);
			} else {
				//ai.attack(this, target, 0.50);
			}
			return true;
		} else {
			this.age -= 2;
			return ai.move(this, this.x + x, this.y + y);
		}
	},

	"attack": function () {
		if (teamCounts[this.team.name] < 10)
			return false;
		// Find the weakest
		var targetTeam,
			targetCount = Number.MAX_VALUE;
		for (var team in teamCounts) {
			if (team != this.team.name && teamCounts[team] < targetCount) {
				targetTeam = team;
				targetCount = teamCounts[team];
			}
		}

		/*var targetTeam,
			targetCount = 0;
		for (var team in teamCounts) {
			if (team != this.team.name && teamCounts[team] > targetCount) {
				targetTeam = team;
				targetCount = teamCounts[team];
			}
		}*/

		if (targetTeam !== undefined) {
			ai.moveTowards(this, teamCOG[targetTeam]);
		}
	},

	"hive": function () {
		return ai.moveTowards(this, teamCOG[this.team.name]);
	},

	"flee": function () {
		if (teamCounts[this.team.name] < 10) {
			if (Math.pow(cog.x - this.x, 2) + Math.pow(cog.y - this.y, 2) < Math.pow(15, 2)) {
				ai.moveAway(this, cog);
			}
		}
	},

	"breed": function () {
		var mate,
			self = this;
		function doCheck(xO, yO) {
			var mate2 = get(self.x + xO, self.y + yO);
			if (mate2 !== undefined) {
				if (mate === undefined)
					mate = mate2;
				else
					mate = false;
			}
		}

		doCheck(-1, 1);
		doCheck(-1, 0);
		doCheck(-1, -1);

		doCheck(0, 1);
		doCheck(0, -1);

		doCheck(1, 1);
		doCheck(1, 0);
		doCheck(1, -1);

		if (mate !== undefined && this.team == mate.team && mate !== false) {
			ai.breed(this, mate);
			return true;
		}
	},

	"mitosis": function() {
		if (teamCounts[this.team.name] < 5) {
			ai.breed(this, this);
			return true;
		}
	},
};

var mainAI = [
	tasks.reaper,
	[tasks.wander, 0.30],
	[tasks.attack, 0.30],
//	[tasksflee, 0.50],
	[tasks.hive, 0.30],
	[tasks.mitosis, 0.03],
//	[tasks.breed, 0.01],
];

var teams = [];
function addTeam(team) {
	team.id = teams.length;
	teams.push(team);
	return team;
}

function setupScoreboard() {
	teams.sort(function (a,b) {
		return a.number - b.number;
	});

	teams.forEach(function(team) {
		team.gui = $('<tr><td><div class="team-color" data-team="'+team.id+'" style="background-color:'+team.color+'"></div> '+team.name+'</td><td class="team-count" data-team="'+team.id+'">0</td></tr>').appendTo("#team-info-panel table");

		$('<span class="button button_color"></span>').appendTo("#buttons").click(function() {
			selectedTeam = team;
			$(".button_color").css({
				"border": "0px",
				"width": "16px",
				"height": "16px"
			});
			$(this).css({
				"border": "1px dashed black",
				"width": "14px",
				"height": "14px"
			});
		}).css("background-color", team.color);
	});
}

function updateTeamTable() {
	var d = 0;

	teams.forEach(function (team) {
		var count = teamCounts[team.name] || 0;
		$($(team.gui).find("td")[0]).html("(" + team.number + ") " + team.name);
		$($(team.gui).find("td")[1]).html(count).parent().css("display", count > 0 ? "inherit" : "none");

		if (count > 0)
			d++;
	});

	if (teams.length > 1 && Object.getOwnPropertyNames(teamCounts).length > 0 && d <= 1) {
		paused = true;
		setTimeout(function() {
			reset();
			paused = false;

			teams[0].wins=(teams.wins||0) +1;

		}, 3000);
	}
}

function get(x, y) {
	var dot;
	for (var i = 0; i < dots.length; i++) {
		dot = dots[i];
		if (Math.abs(dot.x - x) < 0.1 && Math.abs(dot.y - y) < 0.1) {
			return dot;
		}
	}
}

function setTeam(target, team) {
	if (target.type !== undefined && target.type.infected !== undefined) {
		if (!target.type.infected.apply(target))
			return;
	}
	target.oldTeam = target.team;
	target.team = team;
}

function update() {
	renderPreUpdate();
	aiTick();
	dots.forEach(function(dot) {
		// Set up the previous state to be the current state
		dot.oldTeam = dot.team;
		dot.oldX = dot.x;
		dot.oldY = dot.y;

		if (paused)
			return;

		if (dot.type !== undefined) {
			if (dot.type.pre !== undefined) {
				dot.type.pre.apply(dot);
			}
		}

		for (var i = 0; i < dot.team.ai.length; i++) {
			var ai = dot.team.ai[i];
			if (typeof ai == "object") {
				if (Math.random() > ai[1])
					continue;
				ai = ai[0];
			}
			if (ai.apply(dot)) {
				break;
			}
		}

		if (dot.type !== undefined) {
			if (dot.type.update !== undefined) {
				dot.type.update.apply(dot);
			}
		}
	});

	updateTeamTable();
}


function onClick() {
}
