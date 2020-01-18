var ini = require('ini');
var fs = require('fs');
var logger = require('./logger');
var common = require('../common');
var request = require('request-promise');
var options = {};

exports.updateSelectedNode = (req, res, next) => {
  const selNodeIndex = req.body.selNodeIndex;
  common.selectedNode = common.findNode(selNodeIndex);
  const responseVal = !common.selectedNode ? '' : (common.selectedNode.ln_node ? common.selectedNode.ln_node : common.selectedNode.ln_server_url);
  logger.info({fileName: 'RTLConf', msg: 'Selected Node Updated To: ' + JSON.stringify(responseVal)});
  res.status(200).json({status: 'Selected Node Updated To: ' + JSON.stringify(responseVal) + '!'});
};

exports.getRTLConfig = (req, res, next) => {
  if(!common.multi_node_setup) {
    var RTLConfFile = common.rtl_conf_file_path + '/RTL.conf';
    logger.info({fileName: 'RTLConf', msg: 'Getting RTL Config'});
    fs.readFile(RTLConfFile, 'utf8', function(err, data) {
      if (err) {
        logger.error({fileName: 'RTLConf', lineNum: 19, msg: 'Getting RTL Config Failed!'});
        res.status(500).json({
          message: "Reading RTL Config Failed!",
          error: err
        });
      } else {
        const jsonConfig = ini.parse(data);
        const sso = { rtlSSO: common.rtl_sso, logoutRedirectLink: common.logout_redirect_link };
        const authentication = {
          nodeAuthType: common.node_auth_type,
          configPath: common.nodes[0].config_path,
          bitcoindConfigPath: common.nodes[0].bitcoind_config_path
        };
        jsonConfig.Settings.lnImplementation = (jsonConfig.Settings.lnImplementation) ? jsonConfig.Settings.lnImplementation : common.nodes[0].ln_implementation;
        jsonConfig.Settings.channelBackupPath = (jsonConfig.Settings.channelBackupPath) ? jsonConfig.Settings.channelBackupPath : common.nodes[0].channel_backup_path;
        jsonConfig.Settings.flgSidenavOpened = (jsonConfig.Settings.flgSidenavOpened) ? jsonConfig.Settings.flgSidenavOpened : true;
        jsonConfig.Settings.flgSidenavPinned = (jsonConfig.Settings.flgSidenavPinned) ? jsonConfig.Settings.flgSidenavPinned : true;
        jsonConfig.Settings.menu = (jsonConfig.Settings.menu) ? jsonConfig.Settings.menu : 'VERTICAL';
        jsonConfig.Settings.menuType = (jsonConfig.Settings.menuType) ? jsonConfig.Settings.menuType : 'REGULAR';
        jsonConfig.Settings.fontSize = (jsonConfig.Settings.fontSize) ? jsonConfig.Settings.fontSize : 'MEDIUM';
        jsonConfig.Settings.themeMode = (jsonConfig.Settings.themeMode) ? jsonConfig.Settings.themeMode : 'DAY';
        jsonConfig.Settings.themeColor = (jsonConfig.Settings.themeColor) ? jsonConfig.Settings.themeColor : 'PURPLE';
        jsonConfig.Settings.satsToBTC = (jsonConfig.Settings.satsToBTC) ? jsonConfig.Settings.satsToBTC : false;
        res.status(200).json({ defaultNodeIndex: 0, selectedNodeIndex: common.selectedNode.index, sso: sso, nodes: [{
          index: common.nodes[0].index,
          lnNode: 'SingleNode',
          lnImplementation: jsonConfig.Settings.lnImplementation,
          settings: jsonConfig.Settings,
          authentication: authentication}] });
      }
    });
  } else {
    var RTLMultiNodeConfFile = common.rtl_conf_file_path + '/RTL-Multi-Node-Conf.json';
    logger.info({fileName: 'RTLConf', msg: 'Getting Multi Node Config'});
    fs.readFile(RTLMultiNodeConfFile, 'utf8', function(err, data) {
      if (err) {
        if (err.code === 'ENOENT') {
          logger.error({fileName: 'RTLConf', lineNum: 46, msg: 'Multi Node Config does not exist!'});
          res.status(200).json({ defaultNodeIndex: 0, selectedNodeIndex: 0, sso: {}, nodes: [] });
        } else {
          logger.error({fileName: 'RTLConf', lineNum: 49, msg: 'Getting Multi Node Config Failed!'});
          res.status(500).json({
            message: "Reading Multi Node Config Failed!",
            error: err
          });
        }
      } else {
        const multiNodeConfig = JSON.parse(data);
        const sso = { rtlSSO: common.rtl_sso, logoutRedirectLink: common.logout_redirect_link };
        var nodesArr = [];
        if (multiNodeConfig.nodes && multiNodeConfig.nodes.length > 0) {
          multiNodeConfig.nodes.forEach((node, i) => {
            const authentication = {};
            authentication.nodeAuthType = 'CUSTOM';
            if(node.Authentication && node.Authentication.lndConfigPath) {
              authentication.configPath = node.Authentication.lndConfigPath;
            } else if(node.Authentication && node.Authentication.configPath) {
              authentication.configPath = node.Authentication.configPath;
            } else {
              authentication.configPath = '';
            }
              if(node.Settings.bitcoindConfigPath) {
              authentication.bitcoindConfigPath = node.Settings.bitcoindConfigPath;
            }
            node.Settings.channelBackupPath = (node.Settings.channelBackupPath) ? node.Settings.channelBackupPath : common.nodes[i].channel_backup_path;
            node.Settings.flgSidenavOpened = (node.Settings.flgSidenavOpened) ? node.Settings.flgSidenavOpened : true;
            node.Settings.flgSidenavPinned = (node.Settings.flgSidenavPinned) ? node.Settings.flgSidenavPinned : true;
            node.Settings.menu = (node.Settings.menu) ? node.Settings.menu : 'VERTICAL';
            node.Settings.menuType = (node.Settings.menuType) ? node.Settings.menuType : 'REGULAR';
            node.Settings.fontSize = (node.Settings.fontSize) ? node.Settings.fontSize : 'MEDIUM';
            node.Settings.themeMode = (node.Settings.themeMode) ? node.Settings.themeMode : 'DAY';
            node.Settings.themeColor = (node.Settings.themeColor) ? node.Settings.themeColor : 'PURPLE';
            node.Settings.satsToBTC = (node.Settings.satsToBTC) ? node.Settings.satsToBTC : false;
            nodesArr.push({
              index: node.index,
              lnNode: node.lnNode,
              lnImplementation: node.lnImplementation,
              settings: node.Settings,
              authentication: authentication})
          });
        }
        res.status(200).json({ defaultNodeIndex: multiNodeConfig.defaultNodeIndex, selectedNodeIndex: common.selectedNode.index, sso: sso, nodes: nodesArr });
      }
    });
  }
};

exports.updateUISettings = (req, res, next) => {
  var RTLConfFile = '';
  if(common.multi_node_setup) {
    RTLConfFile = common.rtl_conf_file_path + '/RTL-Multi-Node-Conf.json';
    var config = JSON.parse(fs.readFileSync(RTLConfFile, 'utf-8'));
    config.nodes.find(node => {
      if(node.index == common.selectedNode.index) {
        node.Settings.userPersona = req.body.updatedSettings.userPersona;
        node.Settings.themeMode = req.body.updatedSettings.themeMode;
        node.Settings.themeColor = req.body.updatedSettings.themeColor;
        node.Settings.fiatConversion = req.body.updatedSettings.fiatConversion;
        if(req.body.updatedSettings.fiatConversion) {
          node.Settings.currencyUnit = req.body.updatedSettings.currencyUnit ? req.body.updatedSettings.currencyUnit : 'USD';
        } else {
          delete node.Settings.currencyUnit;
        }
        node.Settings.flgSidenavOpened = true; // req.body.updatedSettings.flgSidenavOpened;
        node.Settings.flgSidenavPinned = true; // req.body.updatedSettings.flgSidenavPinned;
        node.Settings.menu = 'VERTICAL'; // req.body.updatedSettings.menu;
        node.Settings.menuType = 'REGULAR'; // req.body.updatedSettings.menuType;
        node.Settings.fontSize = 'MEDIUM'; // req.body.updatedSettings.fontSize;
        node.Settings.satsToBTC = false; // req.body.updatedSettings.satsToBTC;
      }
    });
    try {
      fs.writeFileSync(RTLConfFile, JSON.stringify(config, null, 2), 'utf-8');
      logger.info({fileName: 'RTLConf', msg: 'Updating Application Node Settings Succesful!'});
      res.status(201).json({message: 'Application Node Settings Updated Successfully'});
    }
    catch (err) {
      logger.error({fileName: 'Conf', lineNum: 102, msg: 'Updating Application Node Settings Failed!'});
      res.status(500).json({
        message: "Updating Application Node Settings Failed!",
        error: 'Updating Application Node Settings Failed!'
      });
    }
  } else {
    RTLConfFile = common.rtl_conf_file_path + '/RTL.conf';
    var config = ini.parse(fs.readFileSync(RTLConfFile, 'utf-8'));
    const settingsTemp = config.Settings;
    settingsTemp.userPersona = req.body.updatedSettings.userPersona;
    settingsTemp.themeMode = req.body.updatedSettings.themeMode;
    settingsTemp.themeColor = req.body.updatedSettings.themeColor;
    settingsTemp.fiatConversion = req.body.updatedSettings.fiatConversion;
    if(req.body.updatedSettings.fiatConversion) {
      settingsTemp.currencyUnit = req.body.updatedSettings.currencyUnit ? req.body.updatedSettings.currencyUnit : 'USD';
    }
    settingsTemp.flgSidenavOpened = true; // req.body.updatedSettings.flgSidenavOpened;
    settingsTemp.flgSidenavPinned = true; // req.body.updatedSettings.flgSidenavPinned;
    settingsTemp.menu = 'VERTICAL'; // req.body.updatedSettings.menu;
    settingsTemp.menuType = 'REGULAR'; // req.body.updatedSettings.menuType;
    settingsTemp.fontSize = 'MEDIUM'; // req.body.updatedSettings.fontSize;
    settingsTemp.satsToBTC = false; // req.body.updatedSettings.satsToBTC;
    delete config.Settings;
    fs.writeFileSync(RTLConfFile, ini.stringify(config));
    fs.appendFile(RTLConfFile, ini.stringify(settingsTemp, { section: 'Settings' }), function(err) {
      if (err) {
        logger.error({fileName: 'Conf', lineNum: 122, msg:'Updating Application Node Settings Failed!'});
        res.status(500).json({
          message: "Updating Application Node Settings Failed!",
          error: 'Updating Application Node Settings Failed!'
        });
      } else {
        logger.info({fileName: 'RTLConf', msg: 'Updating Application Node Settings Succesful!'});
        res.status(201).json({message: 'Application Node Settings Updated Successfully'});
      }
    });
  }
};

exports.updateDefaultNode = (req, res, next) => {
  RTLConfFile = common.rtl_conf_file_path + '/RTL-Multi-Node-Conf.json';
  var config = JSON.parse(fs.readFileSync(RTLConfFile, 'utf-8'));
  config.defaultNodeIndex = req.body.defaultNodeIndex;
  try {
    fs.writeFileSync(RTLConfFile, JSON.stringify(config, null, 2), 'utf-8');
    logger.info({fileName: 'RTLConf', msg: 'Updating Default Node Succesful!'});
    res.status(201).json({message: 'Default Node Updated Successfully'});
  }
  catch (err) {
    logger.error({fileName: 'Conf', lineNum: 102, msg: 'Updating Default Node Failed!'});
    res.status(500).json({
      message: "Updating Default Node Failed!",
      error: 'Updating Default Node Failed!'
    });
  }
};

exports.getConfig = (req, res, next) => {
  let confFile = '';
  let JSONFormat = false;
  switch (req.params.nodeType) {
    case 'ln':
      JSONFormat = false;
      confFile = common.selectedNode.config_path;
      break;
    case 'bitcoind':
      JSONFormat = false;
      confFile = common.selectedNode.bitcoind_config_path;
      break;
    case 'rtl':
      JSONFormat = (common.multi_node_setup) ? true : false;
      confFile = (common.multi_node_setup) ? common.rtl_conf_file_path + '/RTL-Multi-Node-Conf.json' : common.rtl_conf_file_path + '/RTL.conf';
      break;
    default:
      JSONFormat = false;
      confFile = '';
      break;
  }
  logger.info({fileName: 'RTLConf', msg: 'Node Type: ' + req.params.nodeType + ', File Path: ' + confFile});
  fs.readFile(confFile, 'utf8', function(err, data) {
    if (err) {
      logger.error({fileName: 'Conf', lineNum: 159, msg: 'Reading Conf Failed!'});
      res.status(500).json({
        message: "Reading Config File Failed!",
        error: err
      });
    } else {
      const jsonConfig = (JSONFormat) ? JSON.parse(data) : ini.parse(data);
      if (jsonConfig.Authentication && jsonConfig.Authentication.rtlPass) {
        jsonConfig.Authentication.rtlPass = jsonConfig.Authentication.rtlPass.replace(/./g, '*');
      }
      if (jsonConfig.Bitcoind && jsonConfig.Bitcoind['bitcoind.rpcpass']) {
        jsonConfig.Bitcoind['bitcoind.rpcpass'] = jsonConfig.Bitcoind['bitcoind.rpcpass'].replace(/./g, '*');
      }
      if (jsonConfig['bitcoind.rpcpass']) {
        jsonConfig['bitcoind.rpcpass'] = jsonConfig['bitcoind.rpcpass'].replace(/./g, '*');
      }
      if (jsonConfig['rpcpassword']) {
        jsonConfig['rpcpassword'] = jsonConfig['rpcpassword'].replace(/./g, '*');
      }
      if (jsonConfig.multiPass) {
        jsonConfig.multiPass = jsonConfig.multiPass.replace(/./g, '*');
      }
      const responseJSON = (JSONFormat) ? jsonConfig : ini.stringify(jsonConfig);
      res.status(200).json({format: (JSONFormat) ? 'JSON' : 'INI', data: responseJSON});
    }
  });
};

exports.getCurrencyRates = (req, res, next) => {
  options.url = 'https://blockchain.info/ticker';
  request(options).then((body) => {
    if(!body || body.error) {
      res.status(500).json({
        message: "Fetching Rates Failed!",
        error: (!body) ? 'Error From External Server!' : body.error
      });
    } else {
      res.status(200).json(body);
      body = JSON.parse(body);
    }
  })
  .catch(function (err) {
    logger.error({fileName: 'Conf', lineNum: 241, msg: 'Fetching Rates Failed! ' + JSON.stringify(err)});
    return res.status(500).json({
      message: "Fetching Rates Failed!",
      error: err.error
    });
  });
};