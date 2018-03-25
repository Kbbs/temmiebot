const Discord = require("discord.js");
const client = new Discord.Client();
client.login("NDI0MjgzNjQ0Njc3NTg2OTQ1.DY2odA.SKQwg525m_cAF18lE59hCemNnb0");

client.on('guildMemberAdd', member => {
    member.guild.channels.get('407879377129308174').send("**^_^ " + member.user.username + " !!** Bienvenue dans " + member.guild.name + " ! On espère que tu vas bien t'amuser ici ! :Temmie:");
});

const YoutubeDL = require('youtube-dl');
const ytdl = require('ytdl-core');

module.exports = function (client, options) {
	// Get all options.
	let PREFIX = (options && options.prefix) || '/';
	let GLOBAL = (options && options.global) || false;
	let MAX_QUEUE_SIZE = (options && options.maxQueueSize) || 20;
	let DEFAULT_VOLUME = (options && options.volume) || 50;
	let ALLOW_ALL_SKIP = (options && options.anyoneCanSkip) || false;
	let CLEAR_INVOKER = (options && options.clearInvoker) || false;
	let CHANNEL = (options && options.channel) || false;

	// Create an object of queues.
	let queues = {};

	// Catch message events.
	client.on('message', msg => {
		const message = msg.content.trim();

		// Check if the message is a command.
		if (message.toLowerCase().startsWith(PREFIX.toLowerCase())) {
			// Get the command and suffix.
			const command = message.substring(PREFIX.length).split(/[ \n]/)[0].toLowerCase().trim();
			const suffix = message.substring(PREFIX.length + command.length).trim();

			// Process the commands.
			switch (command) {
				case 'play':
					return play(msg, suffix);
				case 'skip':
					return skip(msg, suffix);
				case 'queue':
					return queue(msg, suffix);
				case 'pause':
					return pause(msg, suffix);
				case 'reprendre':
					return reprendre(msg, suffix);
				case 'volume':
					return volume(msg, suffix);
				case 'partir':
					return partir(msg, suffix);
				case 'clearqueue':
					return clearqueue(msg, suffix);
			}
			if (CLEAR_INVOKER) {
				msg.delete();
			}
		}
	});

	/**
	 * Checks if a user is an admin.
	 *
	 * @param {GuildMember} member - The guild member
	 * @returns {boolean} -
	 */
	function isAdmin(member) {
		return member.hasPermission("ADMINISTRATOR");
	}

	/**
	 * Checks if the user can skip the song.
	 *
	 * @param {GuildMember} member - The guild member
	 * @param {array} queue - The current queue
	 * @returns {boolean} - If the user can skip
	 */
	function canSkip(member, queue) {
		if (ALLOW_ALL_SKIP) return true;
		else if (queue[0].requester === member.id) return true;
		else if (isAdmin(member)) return true;
		else return false;
	}

	/**
	 * Gets the song queue of the server.
	 *
	 * @param {integer} server - The server id.
	 * @returns {object} - The song queue.
	 */
	function getQueue(server) {
		// Check if global queues are enabled.
		if (GLOBAL) server = '_'; // Change to global queue.

		// Return the queue.
		if (!queues[server]) queues[server] = [];
		return queues[server];
	}

	/**
	 * The command for adding a song to the queue.
	 *
	 * @param {Message} msg - Original message.
	 * @param {string} suffix - Command suffix.
	 * @returns {<promise>} - The response edit.
	 */
	function play(msg, suffix) {
		// Make sure the user is in a voice channel.
		if (!CHANNEL && msg.member.voiceChannel === undefined) return msg.channel.send(wrap('Tu n\'es pas dans le salon vocal -_-'));

		// Make sure the suffix exists.
		if (!suffix) return msg.channel.send(wrap('Aucune vidéo spécifiée...'));

		// Get the queue.
		const queue = getQueue(msg.guild.id);

		// Check if the queue has reached its maximum size.
		if (queue.length >= MAX_QUEUE_SIZE) {
			return msg.channel.send(wrap('Nombre maximum de musique dans la queue atteint !'));
		}

		// Get the video information.
		msg.channel.send(wrap('Je recherche :thinking:')).then(response => {
			var searchstring = suffix
			if (!suffix.toLowerCase().startsWith('http')) {
				searchstring = 'gvsearch1:' + suffix;
			}

			YoutubeDL.getInfo(searchstring, ['-q', '--no-warnings', '--force-ipv4'], (err, info) => {
				// Verify the info.
				if (err || info.format_id === undefined || info.format_id.startsWith('0')) {
					return response.edit(wrap('Vidéo invalide !'));
				}

				info.requester = msg.author.id;

				// Queue the video.
				response.edit(wrap('Mis dans la queue : ' + info.title)).then(() => {
					queue.push(info);
					// Play if only one element in the queue.
					if (queue.length === 1) executeQueue(msg, queue);
				}).catch(console.log);
			});
		}).catch(console.log);
	}


	/**
	 * The command for skipping a song.
	 *
	 * @param {Message} msg - Original message.
	 * @param {string} suffix - Command suffix.
	 * @returns {<promise>} - The response message.
	 */
	function skip(msg, suffix) {
		// Get the voice connection.
		const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
		if (voiceConnection === null) return msg.channel.send(wrap('Je joue actuellement aucune musique -.-'));

		// Get the queue.
		const queue = getQueue(msg.guild.id);

		if (!canSkip(msg.member, queue)) return msg.channel.send(wrap('Tu ne peux pas passer la musique si elle n\'est pas dans la queue !')).then((response) => {
			response.delete(5000);
		});

		// Get the number to skip.
		let toSkip = 1; // Default 1.
		if (!isNaN(suffix) && parseInt(suffix) > 0) {
			toSkip = parseInt(suffix);
		}
		toSkip = Math.min(toSkip, queue.length);

		// Skip.
		queue.splice(0, toSkip - 1);

		// Resume and stop playing.
		const dispatcher = voiceConnection.player.dispatcher;
		if (voiceConnection.paused) dispatcher.resume();
		dispatcher.end();

		msg.channel.send(wrap('**Musique ** ' + toSkip + ' **passée !**'));
	}

	/**
	 * The command for listing the queue.
	 *
	 * @param {Message} msg - Original message.
	 * @param {string} suffix - Command suffix.
	 */
	function queue(msg, suffix) {
		// Get the queue.
		const queue = getQueue(msg.guild.id);

		// Get the queue text.
		const text = queue.map((video, index) => (
			(index + 1) + ': ' + video.title
		)).join('\n');

		// Get the status of the queue.
		let queueStatus = 'Stopé';
		const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
		if (voiceConnection !== null) {
			const dispatcher = voiceConnection.player.dispatcher;
			queueStatus = dispatcher.paused ? 'En pause' : 'En train de jouer';
		}

		// Send the queue and status.
		msg.channel.send(wrap('Queue (' + queueStatus + '):\n' + text));
	}

	/**
	 * The command for pausing the current song.
	 *
	 * @param {Message} msg - Original message.
	 * @param {string} suffix - Command suffix.
	 * @returns {<promise>} - The response message.
	 */
	function pause(msg, suffix) {
		// Get the voice connection.
		const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
		if (voiceConnection === null) return msg.channel.send(wrap('Aucune musique est en train d\'être jouée !'));

		if (!isAdmin(msg.member))
			return msg.channel.send(wrap('Tu n\'es pas autorisé à faire ça <.<'));

		// Pause.
		msg.channel.send(wrap('Le playback à été mis en pause'));
		const dispatcher = voiceConnection.player.dispatcher;
		if (!dispatcher.paused) dispatcher.pause();
	}

	/**
	 * The command for leaving the channel and clearing the queue.
	 *
	 * @param {Message} msg - Original message.
	 * @param {string} suffix - Command suffix.
	 * @returns {<promise>} - The response message.
	 */
	function partir(msg, suffix) {
		if (isAdmin(msg.member)) {
			const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
			if (voiceConnection === null) return msg.channel.send(wrap('Je ne suis dans aucune chaîne vocale ! ;p'));
			// Clear the queue.
			const queue = getQueue(msg.guild.id);
			queue.splice(0, queue.length);

			// End the stream and disconnect.
			voiceConnection.player.dispatcher.end();
			voiceConnection.disconnect();
		} else {
			msg.channel.send(wrap('Tu n\'es pas autorisé à faire ça <.<'));
		}
	}

	/**
	 * The command for clearing the song queue.
	 *
	 * @param {Message} msg - Original message.
	 * @param {string} suffix - Command suffix.
	 */
	function clearqueue(msg, suffix) {
		if (isAdmin(msg.member)) {
			const queue = getQueue(msg.guild.id);

			queue.splice(0, queue.length);
			msg.channel.send(wrap('la queue a été clean'));
		} else {
			msg.channel.send(wrap('Tu n\'es pas autorisé à faire ça <.<'));
		}
	}

	/**
	 * The command for resuming the current song.
	 *
	 * @param {Message} msg - Original message.
	 * @param {string} suffix - Command suffix.
	 * @returns {<promise>} - The response message.
	 */
	function reprendre(msg, suffix) {
		// Get the voice connection.
		const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
		if (voiceConnection === null) return msg.channel.send(wrap('Aucune musique est en train d\'être jouée !'));

		if (!isAdmin(msg.member))
			return msg.channel.send(wrap('Tu n\'es pas autorisé à faire ça <.<'));

		// Resume.
		msg.channel.send(wrap('Le playback a été repris !'));
		const dispatcher = voiceConnection.player.dispatcher;
		if (dispatcher.paused) dispatcher.reprendre();
	}

	/**
	 * The command for changing the song volume.
	 *
	 * @param {Message} msg - Original message.
	 * @param {string} suffix - Command suffix.
	 * @returns {<promise>} - The response message.
	 */
	function volume(msg, suffix) {
		// Get the voice connection.
		const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
		if (voiceConnection === null) return msg.channel.send(wrap('Aucune musique est en train d\'être jouée !'));

		if (!isAdmin(msg.member))
			return msg.channel.send(wrap('Tu n\'es pas autorisé à faire ça <.<'));

		// Get the dispatcher
		const dispatcher = voiceConnection.player.dispatcher;

		if (suffix > 200 || suffix < 0) return msg.channel.send(wrap('Le volume a été mofifié ! :loud_sound:')).then((response) => {
			response.delete(5000);
		});

		msg.channel.send(wrap("Le volume est passé à " + suffix));
		dispatcher.setVolume((suffix/100));
	}

	/**
	 * Executes the next song in the queue.
	 *
	 * @param {Message} msg - Original message.
	 * @param {object} queue - The song queue for this server.
	 * @returns {<promise>} - The voice channel.
	 */
	function executeQueue(msg, queue) {
		// If the queue is empty, finish.
		if (queue.length === 0) {
			msg.channel.send(wrap('Le playback est fini !'));

			// Leave the voice channel.
			const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
			if (voiceConnection !== null) return voiceConnection.disconnect();
		}

		new Promise((resolve, reject) => {
			// Join the voice channel if not already in one.
			const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
			if (voiceConnection === null) {
				if (CHANNEL) {
					msg.guild.channels.find('name', CHANNEL).join().then(connection => {
						resolve(connection);
					}).catch((error) => {
						console.log(error);
					});

				// Check if the user is in a voice channel.
				} else if (msg.member.voiceChannel) {
					msg.member.voiceChannel.join().then(connection => {
						resolve(connection);
					}).catch((error) => {
						console.log(error);
					});
				} else {
					// Otherwise, clear the queue and do nothing.
					queue.splice(0, queue.length);
					reject();
				}
			} else {
				resolve(voiceConnection);
			}
		}).then(connection => {
			// Get the first item in the queue.
			const video = queue[0];

			console.log(video.webpage_url);

			// Play the video.
			msg.channel.send(wrap('**En train de jouer :** ' + video.title)).then(() => {
				let dispatcher = connection.playStream(ytdl(video.webpage_url, {filter: 'audioonly'}), {seek: 0, volume: (DEFAULT_VOLUME/100)});

				connection.on('error', (error) => {
					// Skip to the next song.
					console.log(error);
					queue.shift();
					executeQueue(msg, queue);
				});

				dispatcher.on('error', (error) => {
					// Skip to the next song.
					console.log(error);
					queue.shift();
					executeQueue(msg, queue);
				});

				dispatcher.on('end', () => {
					// Wait a second.
					setTimeout(() => {
						if (queue.length > 0) {
							// Remove the song from the queue.
							queue.shift();
							// Play the next song in the queue.
							executeQueue(msg, queue);
						}
					}, 1000);
				});
			}).catch((error) => {
				console.log(error);
			});
		}).catch((error) => {
			console.log(error);
		});
	}
}

/**
 * Wrap text in a code block and escape grave characters.
 *
 * @param {string} text - The input text.
 * @returns {string} - The wrapped text.
 */
function wrap(text) {
	return '```\n' + text.replace(/`/g, '`' + String.fromCharCode(8203)) + '\n```';
}

const sql = require("sqlite");
sql.open("./score1.sqlite");

const prefix = "/";
client.on("message", message => {
  if (message.author.bot) return;
  if (message.channel.type !== "text") return;

  if (message.content.startsWith(prefix + "test")) {
    message.channel.send("^_^  Test bien reçu :)");
  }

  sql.get(`SELECT * FROM scores1 WHERE userId ="${message.author.id}"`).then(row => {
    if (!row) {
      sql.run("INSERT INTO scores1 (userId, points, level) VALUES (?, ?, ?)", [message.author.id, 1, 0]);
    } else {
      let curLevel = Math.floor(0.1 * Math.sqrt(row.points + 1));
      if (curLevel > row.level) {
        row.level = curLevel;
        sql.run(`UPDATE scores1 SET points = ${row.points + 1}, level = ${row.level} WHERE userId = ${message.author.id}`);
        message.reply(`hOI !!! Tu as évolué ! Tu es maintenant niveau **${curLevel}**! :up:`);
      }
      sql.run(`UPDATE scores1 SET points = ${row.points + 1} WHERE userId = ${message.author.id}`);
    }
  }).catch(() => {
    console.error;
    sql.run("CREATE TABLE IF NOT EXISTS scores1 (userId TEXT, points INTEGER, level INTEGER)").then(() => {
      sql.run("INSERT INTO scores1 (userId, points, level) VALUES (?, ?, ?)", [message.author.id, 1, 0]);
    });
  });
  if (!message.content.startsWith(prefix)) return;

  if (message.content.startsWith(prefix + "level")) {
    sql.get(`SELECT * FROM scores1 WHERE userId ="${message.author.id}"`).then(row => {
      if (!row) return message.reply("Ton niveau est de 0");
      message.reply(`^_^  Tu es niveau ${row.level}`);
    });
  } else

  if (message.content.startsWith(prefix + "xp")) {
    sql.get(`SELECT * FROM scores1 WHERE userId ="${message.author.id}"`).then(row => {
      if (!row) return message.reply("sadly you do not have any points yet!");
      message.reply(`^_^  Tu as ${row.points} xps`);
    });
  }
});

sql.open("./presentation.sqlite");

client.on("message", message => {
  if (message.author.bot) return;
  if (message.channel.type !== "text") return;
    if (message.content.startsWith(prefix + "présentation")) {
    	message.reply(`J\'ai bien enregistrer ta présentation ! ^_^ `);
  sql.get(`SELECT * FROM presentation WHERE userId ="${message.author.id}"`).then(row => {
    if (!row) {
      sql.run("INSERT INTO presentation (userId, texte) VALUES (?, ?)", [message.author.id, message.author.content]);
    }
  }).catch(() => {
    console.error;
    sql.run("CREATE TABLE IF NOT EXISTS presentation (userId TEXT, texte TEXT)").then(() => {
      sql.run("INSERT INTO presentation (userId, texte TEXT) VALUES (?, ?)", [message.author.id, message.author.content]);
    });
  });
}
    if (message.content.startsWith(prefix + "mypresent")) {
    	sql.get(`SELECT * FROM presentation WHERE userId ="${message.author.id}"`).then(row => {
    	message.reply(`**Voilà ta présentation**\n${row.texte}`);
    });
   }
});

client.on("message", message => {
	if(message.content.startsWith("rep ")){
		client.guilds.get("419654256665296896").channels.get("419654257575198722").send(message.content.substr(4))
	}
});
