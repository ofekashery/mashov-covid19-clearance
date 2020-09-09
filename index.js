const fetch = require('node-fetch');
const schedule = require('node-schedule');

////////////////////////////////////////////

const config = {
  parentId: '000000000',
  password: '12345678',
  schoolId: 000000,
  everyDay: true
};

////////////////////////////////////////////

const baseUrl = 'https://web.mashov.info/api';
const apiVersion = '3.20200528';

const log = (...arg) => console.log(`[${new Date().toISOString().split('.')[0]}]`, ...arg);

const login = async () => {
  log('Logging in to your Mashov account...');
  return fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    },
    body: JSON.stringify({
      username: String(config.parentId),
      password: config.password,
      semel: config.schoolId,
      year: 2021,
      apiVersion: apiVersion,
      appBuild: apiVersion,
      appVersion: apiVersion,
      appName: 'הצהרת קורונה אוטומטית'
    })
  }).then((res) => {
    if (!res.ok) return;
    return res.json().then((json) => ({
      ...json,
      csrfToken: res.headers.get('x-csrf-token'),
      sessionId: res.headers.get('set-cookie').split('MashovSessionID=')[1].split(';')[0]
    }));
  });
};

const sendClearances = async () => {
  const loginData = await login();
  if (!loginData) return log('Login failed.');
  log(`Hello, ${loginData.accessToken.displayName}!`);

  const date = new Date().toISOString().split('.')[0];
  for (const child of loginData.accessToken.children) {
    fetch(`${baseUrl}/students/${child.childGuid}/covid/${date}Z/clearance`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': loginData.csrfToken,
        Cookie: `MashovSessionID=${loginData.sessionId}; Csrf-Token=${loginData.csrfToken}`
      },
      body: JSON.stringify({
        answer: 3,
        answererName: loginData.accessToken.displayName,
        answererId: loginData.credential.userId,
        clearanceDate: date,
        lastAnswer: date,
        lastAnswerIsOk: true,
        studentName: child.privateName + child.familyName,
        studentClass: child.classCode + child.classNum,
        userId: child.childGuid,
        noContactWithInfected: true,
        noHeatAndSymptoms: true
      })
    }).then((res) => {
      if (res.ok) {
        log(`The clearance was successfully signed for ${child.privateName}`);
      } else {
        log(`Signature the clearance for ${child.privateName} failed.`);
      }
    });
  }
};

if (config.everyDay) {
  login().then((loginData) => {
    if (!loginData) return log('Login failed.');

    log('Running. Waiting for 07:00.');
    schedule.scheduleJob({ hour: 7, minute: 0 }, () => {
      sendClearances();
    });
  });
} else {
  sendClearances();
}
