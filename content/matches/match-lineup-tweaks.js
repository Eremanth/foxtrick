'use strict';
/**
 * match-lineup-tweaks.js
 * Tweaks for the new style match lineup
 * @author CatzHoek, LA-MJ
 */

Foxtrick.modules['MatchLineupTweaks'] = {
	MODULE_CATEGORY: Foxtrick.moduleCategories.MATCHES,
	PAGES: ['match'],
	OPTIONS: [
		'DisplayTeamNameOnField', 'ShowSpecialties',
		'ConvertStars',
		'SplitLineup',
		'ShowFaces', 'StarCounter', 'StaminaCounter', 'HighlighEventPlayers', 'AddSubstiutionInfo',
		'HighlightMissing'
	],
	OPTIONS_CSS: [
		null, null,
		Foxtrick.InternalPath + 'resources/css/match-lineup-convert-stars.css',
		Foxtrick.InternalPath + 'resources/css/match-lineup-split-lineup.css',
	],
	CSS: Foxtrick.InternalPath + 'resources/css/match-lineup-tweaks.css',
	run: function(doc) {
		if (Foxtrick.Pages.Match.isPrematch(doc)
			|| Foxtrick.Pages.Match.inProgress(doc))
			return;
		if (!Foxtrick.Pages.Match.hasNewRatings(doc))
			return;

		var teamId = Foxtrick.util.id.getTeamIdFromUrl(doc.location.href);
		if (teamId) {
			var awayId = Foxtrick.Pages.Match.getAwayTeamId(doc);
			if (awayId == teamId)
				this.showAway = true;
		}

	},
	// add substition icon for players on the field
	// that are involved in substitutions
	// with alt/title text for minute data
	addSubInfo: function(doc) {

		var subCells = doc.querySelectorAll('.highlightMovements, .highlightCards');
		if (!subCells.length)
			return;

		if (doc.getElementsByClassName('ft-subDiv').length)
			return;

		var playerLinks = doc.querySelectorAll('.playersField > div.playerBoxHome > div > a, ' +
										   '#playersBench > div#playersBenchHome' +
										   ' > div.playerBoxHome > div > a,' +
										   '.playersField > div.playerBoxAway > div > a, ' +
										   '#playersBench > div#playersBenchAway' +
										   ' > div.playerBoxAway > div > a');

		// will be used to regex on image.src
		var SUBSTITUTION_TYPES = {
			SUB: 'substitution|red', // treat red card as sub
			FORMATION: 'formation', // formation change: might be sub or behavior
			BEHAVIOR: 'behavior', // might be sub as well
			SWAP: 'swap',
			YELLOW: 'yellow' // skipped
		};
		var SUB_IMAGES = {};
		SUB_IMAGES[SUBSTITUTION_TYPES.SUB] = 'images/substitution.png';
		SUB_IMAGES[SUBSTITUTION_TYPES.BEHAVIOR] = Foxtrick.InternalPath +
			'resources/img/matches/behavior.png'
		SUB_IMAGES[SUBSTITUTION_TYPES.SWAP] = Foxtrick.InternalPath +
			'resources/img/matches/swap.png';

		var SUB_TEXTS = {};
		SUB_TEXTS[SUBSTITUTION_TYPES.SUB] = [
			Foxtrickl10n.getString('MatchLineupTweaks.out'),
			Foxtrickl10n.getString('MatchLineupTweaks.in')
		];
		SUB_TEXTS[SUBSTITUTION_TYPES.BEHAVIOR] = Foxtrickl10n.getString('MatchLineupTweaks.behavior');
		SUB_TEXTS[SUBSTITUTION_TYPES.SWAP] = Foxtrickl10n.getString('MatchLineupTweaks.swap');

		var highlightSub = function(otherId) {
			Foxtrick.Pages.Match.modPlayerDiv(otherId, function(node) {
				// yellow on field, red on bench
				var className = node.parentNode.id == 'playersField' ?
					'ft-highlight-playerDiv-field' : 'ft-highlight-playerDiv-bench';
				Foxtrick.toggleClass(node, className);
			}, playerLinks);
		};

		var addSubDiv = function(id, min, type, isOut, otherId) {
			if (type == SUBSTITUTION_TYPES.YELLOW)
				return;
			if (type == SUBSTITUTION_TYPES.BEHAVIOR && otherId)
				// sub with behavior change only
				type = SUBSTITUTION_TYPES.SUB;
			if (type == SUBSTITUTION_TYPES.FORMATION) {
				// special case: formation change
				type = otherId ? SUBSTITUTION_TYPES.SUB : SUBSTITUTION_TYPES.BEHAVIOR;
			}
			var rawText;
			// different texts for sbjPlayer & objPlayer, i. e. sub
			if (SUB_TEXTS[type] instanceof Array) {
				rawText = SUB_TEXTS[type][!isOut + 0];
			}
			else
				rawText = SUB_TEXTS[type];
			var subText = rawText.replace(/%s/, min);
			var iconSrc = SUB_IMAGES[type];

			Foxtrick.Pages.Match.modPlayerDiv(id, function(node) {
				//HTs don't seem to appreciate class names here
				//this is bound to break easily
				var subDiv = Foxtrick
					.createFeaturedElement(doc, Foxtrick.modules['MatchLineupTweaks'], 'div');
				subDiv.setAttribute('role', 'button');
				subDiv.setAttribute('tabindex', '0');
				Foxtrick.addClass(subDiv, 'ft-subDiv');
				Foxtrick.addImage(doc, subDiv, {
					src: iconSrc,
					alt: subText,
					title: subText,
				});
				if (otherId) {
					// highlight other player on click
					Foxtrick.onClick(subDiv, function(ev) {
						highlightSub(otherId);
					});
				}
				var target = node.getElementsByClassName('ft-indicatorDiv')[0];
				target.appendChild(subDiv);
			}, playerLinks);
		};

		for (var i = 0; i < subCells.length; i++) {
			var playerCell = subCells[i];
			var row = playerCell.parentNode;
			var typeCell = row.cells[0];
			var timeCell = row.cells[2];

			var time = timeCell.textContent.match(/\d+/)[0];

			var typeImage = typeCell.getElementsByTagName('img')[0];
			var type = '';
			for (var t in SUBSTITUTION_TYPES) {
				if (SUBSTITUTION_TYPES.hasOwnProperty(t)) {
					if (new RegExp(SUBSTITUTION_TYPES[t], 'i').test(typeImage.src)) {
						type = SUBSTITUTION_TYPES[t];
						break;
					}
				}
			}
			if (!type) {
				Foxtrick.log('AddSubInfo: sub type unsupported!', typeImage.src);
				continue;
			}
			var subLinks = playerCell.getElementsByTagName('a');
			var pIds = Foxtrick.map(function(link) {
				return Foxtrick.getParameterFromUrl(link, 'playerid');
			}, subLinks);
			var isSubject = true, sbjPid = pIds[0], objPid = pIds[1] || 0;
			addSubDiv(sbjPid, time, type, isSubject, objPid);

			isSubject = false;
			if (objPid) {
				addSubDiv(objPid, time, type, isSubject, sbjPid);
			}
		}

	},

	//adds teamsnames to the field for less confusion
	runTeamnNames: function(doc) {
		var homeTeamName = Foxtrick.Pages.Match.getHomeTeamName(doc);
		var awayTeamName = Foxtrick.Pages.Match.getAwayTeamName(doc);

		var homeSpan = doc.createElement('span');
		var awaySpan = doc.createElement('span');

		homeSpan.textContent = homeTeamName;
		awaySpan.textContent = awayTeamName;

		Foxtrick.addClass(homeSpan, 'ft-match-lineup-tweaks-teamname');
		Foxtrick.addClass(awaySpan, 'ft-match-lineup-tweaks-teamname');

		Foxtrick.addClass(homeSpan, 'ft-match-lineup-tweaks-teamname-home');
		Foxtrick.addClass(awaySpan, 'ft-match-lineup-tweaks-teamname-away');

		doc.getElementById('playersField').appendChild(homeSpan);
		doc.getElementById('playersField').appendChild(awaySpan);

	},
	//adds apecialty icons for all players, on field and on bench
	runSpecialties: function(doc) {
		var teams = doc.querySelectorAll('h1 > a, h1 > span > a');

		if (!teams.length)
			return; // we're not ready yet

		var homeTeamId = Foxtrick.Pages.Match.getHomeTeamId(doc);
		var awayTeamId = Foxtrick.Pages.Match.getAwayTeamId(doc);

		var homePlayerLinks =
			doc.querySelectorAll('.playersField > div.playerBoxHome > div > a, ' +
			                     '#playersBench > div#playersBenchHome > div.playerBoxHome > div > a');
		var awayPlayerLinks =
			doc.querySelectorAll('.playersField > div.playerBoxAway > div > a, #playersBench > ' +
			                     'div#playersBenchAway > div.playerBoxAway > div > a');

		var addSpecialty = function(node, player) {
			if (node.getElementsByClassName('ft-specialty').length)
				return;
			if (player && player.specialityNumber != 0) {
				var title = Foxtrickl10n.getSpecialityFromNumber(player.specialityNumber);
				var alt = Foxtrickl10n.getShortSpeciality(title);
				var icon_suffix = '';
				if (FoxtrickPrefs.getBool('anstoss2icons'))
					icon_suffix = '_alt';
				Foxtrick.addImage(doc, node, {
					alt: alt,
					title: title,
					src: Foxtrick.InternalPath + 'resources/img/matches/spec' +
						player.specialityNumber + icon_suffix + '.png',
					class: 'ft-specialty ft-match-lineup-tweaks-specialty-icon'
				});
			}
		};

		var addSpecialtiesByTeamId = function(teamid, players) {
			Foxtrick.Pages.Players.getPlayerList(doc,
			  function(playerInfo) {
				Foxtrick.stopListenToChange(doc);
				var missing = [];
				for (var i = 0; i < players.length; i++) {
					var id = Number(Foxtrick.getParameterFromUrl(players[i].href, 'playerid'));
					var player = Foxtrick.Pages.Players.getPlayerFromListById(playerInfo, id);
					var node = players[i].parentNode.parentNode
						.getElementsByClassName('ft-indicatorDiv')[0];
					if (player)
						addSpecialty(node, player);
					else
						missing.push({ id: id, i: i });
				}
				Foxtrick.startListenToChange(doc);
				if (missing.length) {
					for (var j = 0; j < missing.length; ++j) {
						Foxtrick.Pages.Player.getPlayer(doc, missing[j].id,
						  (function(j) {
							return function(p) {
								Foxtrick.stopListenToChange(doc);
								var node = players[missing[j].i].parentNode.parentNode
									.getElementsByClassName('ft-indicatorDiv')[0];
								addSpecialty(node, p ? {
									specialityNumber: p.Specialty
								} : null);
								Foxtrick.startListenToChange(doc);
							}
						})(j));
					}
				}
			}, { teamid: teamid, current_squad: true, includeMatchInfo: true });
		};

		addSpecialtiesByTeamId(homeTeamId, homePlayerLinks);
		addSpecialtiesByTeamId(awayTeamId, awayPlayerLinks);
	},
	runMissing: function(doc) {
		var teams = doc.querySelectorAll('h1 > a, h1 > span > a');

		if (!teams.length)
			return; // we're not ready yet

		if (doc.getElementsByClassName('ft-playerMissing').length)
			return;

		var homeTeamId = Foxtrick.Pages.Match.getHomeTeamId(doc);
		var awayTeamId = Foxtrick.Pages.Match.getAwayTeamId(doc);

		//get player list sucks for nt matches
		var isNT = Foxtrick.Pages.Match.isNT(doc);
		var NT = isNT ? { action: 'view', all: 'false' } : null;

		var homePlayerLinks =
			doc.querySelectorAll('.playersField > div.playerBoxHome > div > a, ' +
			                     '#playersBench > div#playersBenchHome > div.playerBoxHome > div > a');
		var awayPlayerLinks =
			doc.querySelectorAll('.playersField > div.playerBoxAway > div > a, #playersBench > ' +
			                     'div#playersBenchAway > div.playerBoxAway > div > a');

		var alt = Foxtrickl10n.getString('MatchLineupTweaks.missing');

		var addMissingByTeamId = function(teamid, players) {
			Foxtrick.Pages.Players.getPlayerList(doc,
			  function(playerInfo) {
				Foxtrick.stopListenToChange(doc);
				var missing = [];
				for (var i = 0; i < players.length; i++) {
					var id = Number(Foxtrick.getParameterFromUrl(players[i].href, 'playerid'));
					var player = Foxtrick.Pages.Players.getPlayerFromListById(playerInfo, id);
					if (!player)
						missing.push(i);
				}
				if (missing.length) {
					for (var j = 0; j < missing.length; ++j) {
						var playerDiv = players[missing[j]].parentNode.parentNode;
						var ftDiv = playerDiv.getElementsByClassName('ft-indicatorDiv')[0];
						var missingDiv = doc.createElement('div');
						Foxtrick.addClass(missingDiv, 'ft-playerMissing');
						Foxtrick.addImage(doc, missingDiv, {
							alt: alt,
							title: alt,
							src: Foxtrick.InternalPath + 'resources/img/matches/missing.png',
						});
						ftDiv.appendChild(missingDiv);
					}
				}
				Foxtrick.startListenToChange(doc);
			}, { teamid: teamid, current_squad: true, includeMatchInfo: true, NT: NT});
		};

		addMissingByTeamId(homeTeamId, homePlayerLinks);
		addMissingByTeamId(awayTeamId, awayPlayerLinks);
	},
	runFaces: function(doc) {
		var teams = doc.querySelectorAll('h1 > a, h1 > span > a');

		if (!teams.length)
			return; // we're not ready yet

		var isYouth = Foxtrick.Pages.Match.isYouth(doc);
		if (isYouth) {
			// TODO youth?
		}
		else {
			var homeTeamId = Foxtrick.Pages.Match.getHomeTeamId(doc);
			var awayTeamId = Foxtrick.Pages.Match.getAwayTeamId(doc);
			var ownteamid = Foxtrick.util.id.getOwnTeamId();
		}


		var homePlayerLinks =
			doc.querySelectorAll('.playersField > div.playerBoxHome > div > a, ' +
			                     '#playersBench > div#playersBenchHome > div.playerBoxHome > div > a');
		var awayPlayerLinks =
			doc.querySelectorAll('.playersField > div.playerBoxAway > div > a, #playersBench > ' +
			                     'div#playersBenchAway > div.playerBoxAway > div > a');

        var scale = 3;
		var addFace = function(fieldplayer, id, avatarsXml) {
			if (avatarsXml) {
				if (!id)
					return;
				var players = avatarsXml.getElementsByTagName((isYouth ? 'Youth' : '') + 'Player');
				for (var i = 0; i < players.length; ++i) {
					if (id == Number(players[i].getElementsByTagName((isYouth ? 'Youth' : '') +
					    'PlayerID')[0].textContent))
						break;
				}
				if (i == players.length)
					return; // id not found

				Foxtrick.addClass(fieldplayer, 'smallFaceCardBox');

				var shirt = fieldplayer.getElementsByClassName('sectorShirt')[0];

				var kiturl = shirt.getAttribute('kiturl');
				if (!kiturl && !isYouth) {
					var shirtstyle = shirt.getAttribute('style');
					var kiturl = shirtstyle
						.match(/http:\/\/res.hattrick.org\/kits\/\d+\/\d+\/\d+\/\d+\//)[0];
					shirt.setAttribute('kiturl', kiturl);
				}

				if (Foxtrick.hasClass(shirt, 'ft-smallFaceCard'))
					return;

				Foxtrick.addClass(shirt, 'ft-smallFaceCard');

				var sizes = {
					//backgrounds: [0, 0],// don't show
					kits: [92, 123],
					bodies: [92, 123],
					faces: [92, 123],
					eyes: [60, 60],
					mouths: [50, 50],
					goatees: [70, 70],
					noses: [70, 70],
					hair: [92, 123],
					//misc: [0, 0] // don't show (eg cards)
				};
				var layers = players[i].getElementsByTagName('Layer');
				for (var j = 0; j < layers.length; ++j) {
					var src = layers[j].getElementsByTagName('Image')[0].textContent;
					var show = false;
					for (var bodypart in sizes) {
						if (src.search(bodypart) != -1) {
							show = true;
							break;
						}
					}
					if (!bodypart || !show)
						continue;

					if (kiturl && bodypart == 'kits') {
						var body = src.match(/([^\/]+)(\w+$)/)[0];
						src = kiturl + body;
					}
					var x = Math.round(Number(layers[j].getAttribute('x')) / scale);
					var y = Math.round(Number(layers[j].getAttribute('y')) / scale);

					if (FoxtrickPrefs.isModuleOptionEnabled('OriginalFace', 'ColouredYouth'))
						src = src.replace(/y_/, '');
					Foxtrick.addImage(doc, shirt, {
						src: src,
						style: 'top:' + y + 'px;left:' + x + 'px;position:absolute;',
						width: Math.round(sizes[bodypart][0] / scale),
						height: Math.round(sizes[bodypart][1] / scale)
					});
				}
			}
		};

		var addFacesByTeamId = function(teamid, players) {
			if (teamid == ownteamid) {
				Foxtrick.util.api.retrieve(doc, [['file', (isYouth ? 'youth' : '') + 'avatars']],
				                           { cache_lifetime: 'session' },
				  function(xml, errorText) {
					if (errorText) {
						Foxtrick.log(errorText);
						return;
					}
					Foxtrick.stopListenToChange(doc);
					for (var i = 0; i < players.length; i++) {
						var id = Number(Foxtrick.getParameterFromUrl(players[i].href, 'playerid'));
						addFace(players[i].parentNode.parentNode, id, xml);
					}
					Foxtrick.startListenToChange(doc);
				});
			}
		};

		addFacesByTeamId(homeTeamId, homePlayerLinks);
		addFacesByTeamId(awayTeamId, awayPlayerLinks);
	},

	//adds a star summary to the page
	runStars: function(doc) {
		//get the sum of stars from all players on the 'palyersField'
		//@where: 'away' or 'home' ... that's replacing HTs classnames accordingly during lookup
		var countStars = function(doc, where) {
			var stars = 0;
			var ratings = doc.querySelectorAll('.playersField > .playerBox' + where +
				' > .playerRating');  //
			for (var i = 0; i < ratings.length; i++) {
				var id = Foxtrick.Pages.Players.getPlayerId(ratings[i].parentNode);
				stars += Number(ratings[i].textContent);
			}
			return stars;
		};
		var ratingTemplate = doc.getElementsByClassName('playerRating')[0];
		if (!ratingTemplate)
			return; // we're not ready yet
		if (doc.getElementsByClassName('ft-match-lineup-tweaks-star-counter').length)
			return;

		var starsHome = countStars(doc, 'Home');
		var starsAway = countStars(doc, 'Away');

		var displayHome = Foxtrick.createFeaturedElement(doc, this, 'div');
		Foxtrick.addClass(displayHome, 'ft-match-lineup-tweaks-star-counter');
		displayHome.appendChild(doc.createElement('span'));

		var displayAway = displayHome.cloneNode(true);
		var displayDiff = displayHome.cloneNode(true);

		//U+2211 is sum symbol, U+0394 is mathematical delta, U+2605 is star
		displayHome.getElementsByTagName('span')[0].textContent = '\u2211 ' + starsHome + '\u2605';
		displayAway.getElementsByTagName('span')[0].textContent = '\u2211 ' + starsAway + '\u2605';
		displayDiff.getElementsByTagName('span')[0].textContent = '\u0394 ' +
			Math.abs(starsHome - starsAway) + '\u2605';

		Foxtrick.addClass(displayHome, 'ft-match-lineup-tweaks-stars-counter-sum-home');
		Foxtrick.addClass(displayDiff, 'ft-match-lineup-tweaks-stars-counter-diff');
		Foxtrick.addClass(displayAway, 'ft-match-lineup-tweaks-stars-counter-sum-away');

		var starsContainer = doc.createDocumentFragment();

		starsContainer.appendChild(displayHome);
		starsContainer.appendChild(displayDiff);
		starsContainer.appendChild(displayAway);

		doc.getElementById('playersField').appendChild(starsContainer);
	},

	//adds a stamina sumary to the page
	runStamina: function(doc) {
		//get the sum of stars from all players on the 'playersField'
		//@where: 'away' or 'home' ... that's replacing HTs classnames accordingly during lookup
		var getStaminaAverage = function(doc, where) {
			var stamina = 0.0;
			var fieldPlayerCount = 0.0;

			var getStaminaFromNode = function(doc, node) {
				var staminaTitle = node.getElementsByClassName('sectorShirt')[0].nextSibling
					.firstChild.title;

				var stamina = staminaTitle.match(/\d+/);
				return Number(stamina);
			};

			var items = doc.querySelectorAll('.playersField > .playerBox' + where);
			fieldPlayerCount = items.length; //needed for determining the average later on

			for (var i = 0; i < items.length; i++) {
				stamina += getStaminaFromNode(doc, items[i]);
			}
			return parseInt(stamina / fieldPlayerCount);
		};

		if (!doc.querySelectorAll('.playersField > .playerBoxHome').length)
			return; // we're not ready yet

		var staminaHome = getStaminaAverage(doc, 'Home');
		var staminaAway = getStaminaAverage(doc, 'Away');

		var displayHome = Foxtrick.createFeaturedElement(doc, this, 'div');
		Foxtrick.addClass(displayHome, 'ft-match-lineup-tweaks-stamina-counter');
		displayHome.appendChild(doc.createElement('span'));

		var displayAway = displayHome.cloneNode(true);
		var displayDiff = displayHome.cloneNode(true);

		//U+2211 is sum symbol, U+0394 is mathematical delta
		displayHome.getElementsByTagName('span')[0].textContent = '\u00D8 ' + staminaHome + ' %';
		displayAway.getElementsByTagName('span')[0].textContent = '\u00D8 ' + staminaAway + ' %';
		displayDiff.getElementsByTagName('span')[0].textContent = '\u0394 ' +
			parseInt(Math.abs(staminaHome - staminaAway)) + ' %';

		Foxtrick.addClass(displayHome, 'ft-match-lineup-tweaks-stamina-counter-sum-home');
		Foxtrick.addClass(displayDiff, 'ft-match-lineup-tweaks-stamina-counter-diff');
		Foxtrick.addClass(displayAway, 'ft-match-lineup-tweaks-stamina-counter-sum-away');

		var staminaContainer = doc.createDocumentFragment();

		staminaContainer.appendChild(displayHome);
		staminaContainer.appendChild(displayDiff);
		staminaContainer.appendChild(displayAway);

		doc.getElementById('playersField').appendChild(staminaContainer);
	},

	runEventPlayers: function(doc) {
		var timelineEventDetails = doc.getElementById('timelineEventDetails');
		if (!timelineEventDetails || !timelineEventDetails.childNodes.length)
			return;

		var info = timelineEventDetails.getElementsByClassName('timelineEventDetailsInfo')[0];
		if (!info)
			return;
		var players = info.getElementsByTagName('a');
		if (!players.length)
			return;

		var eventIcon = timelineEventDetails.getElementsByClassName('timelineEventDetailsIcon')[0]
			.getElementsByTagName('img')[0];

		var isHome = Foxtrick.hasClass(info, 'highlightHome');

		var playerLinks = doc.querySelectorAll('.playersField > div.playerBox' +
										   (isHome ? 'Home' : 'Away') + ' > div > a, ' +
										   '#playersBench > div#playersBench' +
										   (isHome ? 'Home' : 'Away') +
										   ' > div.playerBox' +
										   (isHome ? 'Home' : 'Away') + ' > div > a');

		var highlightPlayer = function(playerId) {
			Foxtrick.Pages.Match.modPlayerDiv(playerId, function(node) {
				if (node.parentNode.id == 'playersField')
					Foxtrick.addClass(node, 'ft-highlight-playerDiv-field');
				else
					Foxtrick.addClass(node, 'ft-highlight-playerDiv-bench');
			}, playerLinks);
		};

		for (var i = 0; i < players.length; i++) {
			var player = Number(Foxtrick.getParameterFromUrl(players[i].href, 'playerid'));
			highlightPlayer(player);
		}

	},
	// change the number-star display into real stars
	convertStars: function(doc) {
		var ratings = doc.querySelectorAll('div.playerRating > span');
		for (var i = 0; i < ratings.length; i++) {
			var ratingsDiv = ratings[i].parentNode;
			var count = Number(ratings[i].textContent);
			var newDiv = ratingsDiv.cloneNode(false);
			Foxtrick.makeFeaturedElement(newDiv, this);
			// weirdest bug ever: title too short
			newDiv.title = count + '\u2605    ';
			var smallDiv = doc.createElement('div');
			Foxtrick.addClass(smallDiv, 'ft-4starDiv');
			// this one will fit small stars
			var stars5 = Math.floor(count / 5);
			count = count % 5;
			var stars2 = Math.floor(count / 2);
			count = count % 2;
			for (var j = 0; j < stars5; j++) {
				var star5container = doc.createElement('div');
				// this one's for async image purposes
				Foxtrick.addImage(doc, star5container, {
					src: Foxtrick.InternalPath + 'resources/img/matches/5stars.png'
				});
				newDiv.appendChild(star5container);
			}
			for (var j = 0; j < stars2; j++) {
				Foxtrick.addImage(doc, smallDiv, {
					src: Foxtrick.InternalPath + 'resources/img/matches/2stars_h.png'
				});
			}
			newDiv.appendChild(smallDiv);
			if (count) {
				// 4.5 stars is a pain in the ass
				var target;
				if (count == 0.5 && smallDiv.childNodes.length == 2) {
					// 4.5
					target = newDiv;
				}
				else
					target = smallDiv;
				Foxtrick.addImage(doc, target, {
					src: Foxtrick.InternalPath + 'resources/img/matches/' + count + 'stars_h.png'
				});
			}

			ratingsDiv.parentNode.replaceChild(newDiv, ratingsDiv);
		}
	},
	// which team to show in split
	showAway: false,
	// split lineup into two for home/away
	splitLineup: function(doc) {
		this.hideOtherTeam(doc);
		// that one started: stop again
		//Foxtrick.stopListenToChange(doc);
		var awayDivs = doc.querySelectorAll('div.playerBoxAway');
		for (var i = 0; i < awayDivs.length; i++) {
			awayDivs[i].style.top = (Number(awayDivs[i].style.top.match(/\d+/)) - 240) + 'px';
		}
		var f = doc.getElementById('playersField');
		var div = doc.createElement('div');
		div.setAttribute('role', 'button');
		div.setAttribute('tabindex', '0');
		var alt = Foxtrickl10n.getString('MatchLineupTweaks.showOther');
		Foxtrick.addImage(doc, div, {
			src: '/Img/Icons/transparent.gif',
			id: 'ft-split-arrow',
			title: alt,
			alt: alt,
		});
		Foxtrick.onClick(div, (function(module) {
			return function(e) {
				Foxtrick.stopListenToChange(doc);
				module.showAway = !module.showAway;
				module.hideOtherTeam(doc);
				Foxtrick.startListenToChange(doc);
			};
		})(this));
		f.appendChild(div);
	},
	hideOtherTeam: function(doc) {
		var hideDivs = doc.querySelectorAll('div.playerBox' + (this.showAway ? 'Home' : 'Away'));
		for (var i = 0; i < hideDivs.length; i++) {
			Foxtrick.addClass(hideDivs[i], 'hidden');
		}
		var showDivs = doc.querySelectorAll('div.playerBox' + (this.showAway ? 'Away' : 'Home'));
		for (var i = 0; i < showDivs.length; i++) {
			Foxtrick.removeClass(showDivs[i], 'hidden');
		}
		var f = doc.getElementById('playersField');
		if (this.showAway)
			Foxtrick.addClass(f, 'ft-field-away');
		else
			Foxtrick.removeClass(f, 'ft-field-away');
	},

	change: function(doc) {
		if (Foxtrick.Pages.Match.isPrematch(doc)
			|| Foxtrick.Pages.Match.inProgress(doc))
			return;
		if (!Foxtrick.Pages.Match.hasNewRatings(doc))
			return;

		Foxtrick.stopListenToChange(doc);

		var playerDivs = doc.querySelectorAll('div.playerDiv');
		if (playerDivs.length && playerDivs[0].getElementsByClassName('ft-indicatorDiv').length)
			// been here before
			return;

		if (FoxtrickPrefs.isModuleOptionEnabled('MatchLineupTweaks', 'SplitLineup'))
			this.splitLineup(doc);

		for (var i = 0; i < playerDivs.length; i++) {
			var player = playerDivs[i];
			var ftdiv = Foxtrick.createFeaturedElement(doc, this, 'div');
			Foxtrick.addClass(ftdiv, 'ft-indicatorDiv');
			var staminaDiv = player.querySelector('div.sectorShirt + div > div');
			if (staminaDiv) {
				var stamina = staminaDiv.title.match(/\d+/)[0];
				var fatigue = 100 - Number(stamina);
				staminaDiv.firstChild.style.height = fatigue + '%';
				var staminaSpan = doc.createElement('span');
				Foxtrick.addClass(staminaSpan, 'ft-staminaText');
				staminaSpan.style.backgroundColor = staminaDiv.style.backgroundColor;
				// let's 'hide' 100
				staminaSpan.textContent = (stamina != 100) ? stamina : '00';
				if (stamina == 100)
					staminaSpan.style.color = staminaSpan.style.backgroundColor;
				staminaSpan.title = staminaDiv.title;
				ftdiv.appendChild(staminaSpan);
			}
			player.appendChild(ftdiv);
		}

		// add ft-stars="N" to ratings spans for possible styling
		var ratings = doc.querySelectorAll('div.playerRating > span');
		for (var i = 0; i < ratings.length; i++) {
			var count = Number(ratings[i].textContent);
			ratings[i].setAttribute('ft-stars', count);
		}


		var hId = doc.location.search.match(/HighlightPlayerID=(\d+)/i);
		if (hId) {
			var playerLinks = doc.querySelectorAll('.playersField > div.playerBoxHome > div > a, ' +
											   '#playersBench > div#playersBenchHome' +
											   ' > div.playerBoxHome > div > a,' +
											   '.playersField > div.playerBoxAway > div > a, ' +
											   '#playersBench > div#playersBenchAway' +
											   ' > div.playerBoxAway > div > a');
			var highlightPlayer = function(playerId) {
				var link = Foxtrick.filter(function(link) {
					return new RegExp(playerId).test(link.href);
				}, playerLinks)[0];
				if (link)
					Foxtrick.addClass(link.parentNode.parentNode, 'ft-highlight-playerDiv-url');
			};
			highlightPlayer(hId[1]);
		}

		if (FoxtrickPrefs.isModuleOptionEnabled('MatchLineupTweaks', 'DisplayTeamNameOnField'))
			this.runTeamnNames(doc);

		if (FoxtrickPrefs.isModuleOptionEnabled('MatchLineupTweaks', 'HighlighEventPlayers'))
			this.runEventPlayers(doc);
		if (FoxtrickPrefs.isModuleOptionEnabled('MatchLineupTweaks', 'AddSubstiutionInfo'))
			this.addSubInfo(doc);

		if (FoxtrickPrefs.isModuleOptionEnabled('MatchLineupTweaks', 'StarCounter'))
			this.runStars(doc);
		if (FoxtrickPrefs.isModuleOptionEnabled('MatchLineupTweaks', 'StaminaCounter'))
			this.runStamina(doc);
		// run this after the counters
		if (FoxtrickPrefs.isModuleOptionEnabled('MatchLineupTweaks', 'ConvertStars'))
			this.convertStars(doc);


		Foxtrick.startListenToChange(doc);

		//add async shit last

		if (FoxtrickPrefs.isModuleOptionEnabled('MatchLineupTweaks', 'ShowSpecialties'))
			this.runSpecialties(doc);

		if (FoxtrickPrefs.isModuleOptionEnabled('MatchLineupTweaks', 'ShowFaces') &&
			Foxtrick.util.layout.isSupporter(doc))
			this.runFaces(doc);

		if (FoxtrickPrefs.isModuleOptionEnabled('MatchLineupTweaks', 'HighlightMissing'))
			this.runMissing(doc);

	}
};
