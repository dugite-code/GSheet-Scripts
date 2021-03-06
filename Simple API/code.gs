function onInstall(e) {
  onOpen(e);
}

function onOpen(e) {
  var ui = SpreadsheetApp.getUi();
  // Or DocumentApp or FormApp.

  ui.createMenu('API')
  .addItem('Settings', 'settings_ui')
  .addSeparator()
  .addItem('Delete Settings', 'settings_del')
  .addToUi();
}

function settings_ui() {
  //Open html modal Dialog
  var html = HtmlService.createTemplateFromFile('settings')
      .evaluate().setHeight(325);
  SpreadsheetApp.getUi() // Or DocumentApp or FormApp.
  .showModalDialog(html, 'Settings');
}

function SHA512(input) {//https://pthree.org/2016/02/26/digest-algorithms-in-google-spreadsheets/
  var hexstr = '';
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_512, input);
  for (i = 0; i < digest.length; i++) {
    var val = (digest[i]+256) % 256;
    hexstr += ('0'+val.toString(16)).slice(-2);
  }
  return hexstr;
}

function checksheet(optSheetName){
  var sheetName = optSheetName || "Simple API";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = call_(function() {return ss.getSheets();});
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName() === sheetName) {
      sheet_ = sheets[i];
      return;
    }
  }
  sheet_ = ss.insertSheet(sheetName, i);
  sheet_.getRange(1,1).setValue("Simple API - Auto Created Sheet");
  sheet_.setFrozenRows(1);
}

function settings_save(api_key,sheet_name,data_row,data_column,row_number,column_number,logging,log_level){
  var ui = SpreadsheetApp.getUi();
  var DocumentProperties = PropertiesService.getDocumentProperties();
  var Curr_API_Key = DocumentProperties.getProperty('API_Key');
  if(api_key){
    DocumentProperties.setProperty('API_Key', SHA512(api_key));
  } else if(!Curr_API_Key) {
    var message = "Error No API KEY Set";
    ui.alert(message);
  }
  if(sheet_name && data_row && data_column && row_number && column_number && log_level){
    checksheet(sheet_name);
    DocumentProperties.setProperty('Sheet_Name', sheet_name);
    DocumentProperties.setProperty('Data_Row', data_row);
    DocumentProperties.setProperty('Data_Column', data_column);
    DocumentProperties.setProperty('Row_Number', row_number);
    DocumentProperties.setProperty('Column_Number', column_number);
    if(logging){
      DocumentProperties.setProperty('api_logging',"True");
    } else {
      DocumentProperties.setProperty('api_logging',"False");
    }
    DocumentProperties.setProperty('log_level',log_level);
    var message = "Settings saved";
    ui.alert(message);
  } else {
    var message = "Error One Or More Required Variables Are Not Set";
  }

}

function settings_load(){
  var DocumentProperties = PropertiesService.getDocumentProperties();
  var sheet_name = DocumentProperties.getProperty('Sheet_Name');
  var data_row = DocumentProperties.getProperty('Data_Row');
  var data_column = DocumentProperties.getProperty('Data_Column');
  var row_number = DocumentProperties.getProperty('Row_Number');
  var column_number = DocumentProperties.getProperty('Column_Number');
  var logging = DocumentProperties.getProperty('api_logging');
  var log_level = DocumentProperties.getProperty('log_level');

  return [sheet_name,data_row,data_column,row_number,column_number,logging,log_level];
}

function settings_del(){
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert('Delete API settings', 'Are you sure you want to delete this?', ui.ButtonSet.YES_NO);
  if(response == ui.Button.YES){
    var DocumentProperties = PropertiesService.getDocumentProperties();
    DocumentProperties.deleteProperty('API_Key');
    DocumentProperties.deleteProperty('Sheet_Name');
    DocumentProperties.deleteProperty('Data_Row');
    DocumentProperties.deleteProperty('Data_Column');
    DocumentProperties.deleteProperty('Row_Number');
    DocumentProperties.deleteProperty('Column_Number');
    DocumentProperties.deleteProperty('api_logging');
    DocumentProperties.deleteProperty('log_level');
  }
}

function doGet(data) {
  if(data){
    if (data.parameters["key"] !== null){
      var sub_key = SHA512(data.parameters["key"][0])
      var DocumentProperties = PropertiesService.getDocumentProperties();
      var API_Key = DocumentProperties.getProperty('API_Key');
      if(sub_key !== API_Key){
        return ContentService.createTextOutput('Error: Unauthorised');
      }else if(sub_key == API_Key){
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var sheet_name = DocumentProperties.getProperty('Sheet_Name');
        checksheet(sheet_name);
        var source_sheet = ss.getSheetByName(sheet_name); // Get the required spreadsheet
        var data_row = DocumentProperties.getProperty('Data_Row');
        var data_col = DocumentProperties.getProperty('Data_Column');
        var row_num = DocumentProperties.getProperty('Row_Number');
        var col_num = DocumentProperties.getProperty('Column_Number');
        var sheet_data = source_sheet.getRange(data_row, data_col, row_num, col_num).getValues(); // (start row, start column, number of Rows, number of Columns)
        // A value of 1, 1, 3, 3 selects A1:C3

        // Build a comma seperated list source https://www.drzon.net/posts/export-all-google-sheets-to-csv/
        if (sheet_data.length >= 1) {
          var csv = "";
          for (var row = 0; row < sheet_data.length; row++) {
            for (var col = 0; col < sheet_data[row].length; col++) {
              if (sheet_data[row][col].toString().indexOf(",") != -1) {
                sheet_data[row][col] = "\"" + sheet_data[row][col] + "\"";
              }
            }

            // join each row's columns
            // add a carriage return to end of each row, except for the last one
            if (row < sheet_data.length-1) {
              csv += sheet_data[row].join(",") + "\r\n";
            }
            else {
              csv += sheet_data[row];
            }
          }
          return ContentService.createTextOutput(csv).setMimeType(ContentService.MimeType.CSV)
        }
        return ContentService.createTextOutput('Error: No data found');
      }
    }else{
      return ContentService.createTextOutput('Error: Unauthorised');
    }
  }
  return ContentService.createTextOutput('Error: Unauthorised');
}
