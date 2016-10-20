const Botkit = require('botkit');
const request = require('request');

var config = {
	slackToken: '{slacktoken}',                                                                            //Token for slack
	keyWord:['(bug)','(issue)','(workitem)','(queue)','(added)','(list)','(priority)','(pick)','#'],       //Keywords to match - Use '()' for case insensitive
	pattern: '\\d{1,}',                                                                                    //Regualr expression to match
	colours: {                                                                                             //Colours for workitems
		blue: '#3498db',
		green: '#2ecc71',
		red: '#e74c3c',
		yellow: '#f1c40f',
		purple: '#9b59b6',
		orange: '#e67e22'
	},                                          
	url: '{url}',                                                                                          //Url for links to redirect to - {name.visualstudio.com/collection/_workitems?id=}
	when: ['direct_message','direct_mention','mention','ambient'],                                         //When should bot respond
	tfsConfig: {
		tfsURL: '{url}}',                                                                                  //Url for TFS - {https://name.visualstudio.com},{http://{name}:8080/tfs}
		authType: 'BASIC',                                                                                 //Select authorization methood {PAT},{BASIC}
		apiVersion: '2.0',                                                                                 //Current version of TFS API
		userName: '{username}',                                                                            //BASIC AUTHORIZATION - Username
		password: '{password}',                                                                            //BASIC AUTHORIZATION - Password
		tfsToken: '{personal access token}'                                                                //PAT AUTHORIZATION - Visual Studio Team Serves personal access token - requires read access to workitems
	}
};

var controller = Botkit.slackbot({
	debug: false
})

controller.spawn({
	token: config.slackToken,
}).startRTM(function(err, bot, payload){
	if(err){
		throw new Error('Error connceting to slack: ', err);
	}
	console.log('Connected to slack');
});

//Configure API url
var setApiURL = config.tfsConfig.tfsURL + '/defaultcollection/_apis/wit/workitems?api-version=' + config.tfsConfig.apiVersion;

//Configure authorization
var authMethod;
if(config.tfsConfig.authType === 'PAT')
	authMethod = 'Basic ' + new Buffer('' + ':' + config.tfsConfig.tfsToken).toString('base64');
else if(config.tfsConfig.authType === 'BASIC')
	authMethod = 'Basic ' + new Buffer(config.tfsConfig.userName + ':' + config.tfsConfig.password).toString('base64');

controller.hears(config.keyWord, config.when, function(bot,message) {
	var matches = message.text.match(new RegExp(config.pattern, 'g'));
	var attachment=[];

	//Debug
	console.log('Matches Pattern: ' + matches);
	console.log(message.match);

	if (matches !== null){
		for (var i=0; i<matches.length; i++){
			itemURL = setApiURL + '&ids=' + matches[i];
			console.log('API CALL: ' + itemURL);
			request({
			    headers: {
		    		Authorization: authMethod,
			    },
			    dataType: 'json',
			    uri: itemURL,
			}, function (err, res, object) {
				var data = JSON.parse(object);
				if(data.message !== undefined && data.message.startsWith('TF401232')){
					bot.reply(message,{
						text: ':warning: ' + data.message.substring(10, data.message.indexOf(',')) + '.'
					})
				}
				else{
					assembleAttachment(attachment, data);
					bot.reply(message,{
						attachments: attachment
					})
					attachment=[];
				}
			});
		}
	}
})

function assembleAttachment(attachment, data){
	var id = data.value[0].id;
	var fields = data.value[0].fields;
    attachment.push({
    	title: ':link2: ' + fields['System.WorkItemType'] + ': ' + id + ' - ' + fields['System.Title'],  	
		title_link: config.url + id,
		color: configureWorkitemColour(fields['System.WorkItemType']),
		fields: [
			{
                title: 'Iteration',
                value: fields['System.IterationPath'],
                short: false
            },
            {
                title: 'State',
                value: fields['System.State'],
                short: true
            },
            {
                title: 'Severity',
                value: configureSeverity(fields['Microsoft.VSTS.Common.Severity']),
                short: true
        	},
        	{
                title: 'Created By',
                value: fields['System.CreatedBy'].substring(0,fields['System.CreatedBy'].indexOf('<')),
                short: true
        	},
        	{
                title: 'Created On',
                value: fields['System.CreatedDate'].substring(0,10),
                short: true
        	}
		],
		footer: configureTags(fields['System.Tags']),	
	});
}

function configureSeverity(severity){
	if(severity !== undefined){
		switch(severity){
			case('1 - Critical'):
				return ':red: ' + severity.substring(3);
			case('2 - High'):
				return ':yellow: ' + severity.substring(3);
			case('3 - Medium'):
				return ':yellow: ' + severity.substring(3);
			case('4 - Low'):
				return ':green: ' + severity.substring(3);
		}
	}
}

function configureTags(tags){
	if(tags !== undefined)
		return ':tag: ' + tags.replace(';',', ')
}

//TODO:: Will configure fields by workitem type
function configureFields(workitem){
	var fields=[];
	switch (workItem.toLowerCase()){
		case'bug':

		case'task':

		case'user story':
		case'product backlog item':

		case'feature':

		case'epic':
		case'impediment':
		case'test case':

	}
}

function configureWorkitemColour(workItem){
	switch (workItem.toLowerCase()){
		case'bug':
			return config.colours.red;
		case'task':
			return config.colours.yellow;
		case'user story':
		case'product backlog item':
			return config.colours.blue;
		case'feature':
			return config.colours.purple;
		case'epic':
		case'impediment':
		case'test case':
			return config.colours.orange;
	}
}