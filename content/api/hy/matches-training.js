/**
 * matches-training.js
 * url: 'https://www.hattrick-youthclub.org/_data_provider/foxtrick/matchesTraining';
 *
 * params:
 * hash: md5/sha1/base64(app + '_' + teamId + '_' + identifier)
 * lang: the language as mentioned in the html meta tag of hattrick.org
 * identifier: a random (unique, changing with every request) identifier
 * just for securing the request
 * primaryTraining: selected primary training value
 * secondaryTraining: selected secondary training value
 *
 * STATUS CODES
 * HTTP 200:
 * - Ok
 * HTTP 400:
 * - not all data is given
 * HTTP 401
 * - unauthorized request
 * HTTP 503
 * - service temporarly not available
 */

'use strict';

/* eslint-disable */
if (!this.Foxtrick)
	// @ts-ignore
	var Foxtrick = {};
/* eslint-enable */

if (!Foxtrick.api)
	Foxtrick.api = {};
if (!Foxtrick.api.hy)
	Foxtrick.api.hy = {};
if (!Foxtrick.api.hy.URL)
	Foxtrick.api.hy.URL = {};

Foxtrick.api.hy.URL.matchesTraining = 'https://www.hattrick-youthclub.org' +
	'/_data_provider/foxtrick/matchesTraining';

/**
 * Tries to post the match report to HY and executes callback(response);
 * failure() is called if the request fails
 * finalize() is always called
 * @param  {function} callback   function to execute
 * @param  {string}   params     specific params for the api
 * @param  {function} [failure]  function to execute
 * @param  {function} [finalize] function to execute
 * @param  {number}   [teamId]   senior team ID to fetch data for
 */
Foxtrick.api.hy.postTrainingChange = function(callback, params, failure, finalize, teamId) {
	Foxtrick.api.hy._fetchGeneric('matchesTraining', callback, params, failure, finalize, teamId);
};
