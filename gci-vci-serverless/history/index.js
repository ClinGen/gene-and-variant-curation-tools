console.log('Loading function');

const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
const HISTORY_TABLE = process.env['HISTORY_TABLE'];

function shouldRecordRecord(/* record */) {
    return true; // TODO: Write filtering logic
}

function modifiedBy(newImage, oldImage) {
    let modifiedBy = newImage && newImage.modified_by && newImage.modified_by.S;
    modifiedBy = modifiedBy || (oldImage && oldImage.modifiedBy && oldImage.modifiedBy.S);
    return modifiedBy || "unknown";
}

function getHistoryItem(record, modifiedDate) {
    // We seem only interested in modified_by at the moment,
    // so let's pull that and insert it along with PK from the original
    // table
    const pk = record.dynamodb.Keys.PK && record.dynamodb.Keys.PK.S;
    const modified_by = modifiedBy(record.dynamodb.NewImage, record.dynamodb.OldImage);
    const item_type = (record.dynamodb.NewImage.item_type && record.dynamodb.NewImage.item_type.S) || 'unknown';
    const status = (record.dynamodb.NewImage.status && record.dynamodb.NewImage.status.S) || 'unknown';
    if (!pk) {
        console.log('no PK/modified_by found on record - skipping');
        return;
    }
    console.log('Keys: ', record.dynamodb.Keys)
    console.log('New Image: ', record.dynamodb.NewImage)
    // This might be wrong, as there will be a delay from the stream
    // processing. If so, try the commented code instead, which
    // will prioritize the last_modified attribute if it exists
    const modified = modifiedDate.toISOString();
    // const modified_date = record.dynamodb.Keys.last_modified ||
    //                         modifiedDate.toISOString();
    return {
        PK: pk,
        last_modified: modified,
        modified_by,    // is this supposed to be a key-pair? else how is it being matched to 'modified_by' category?
        item_type: item_type,
        status: status,
        change_type: record.eventName,
        change: record
    };
}

async function writeHistoryItems(items) {
    const params = {
        RequestItems: {},
        ReturnConsumedCapacity: 'NONE',
        ReturnItemCollectionMetrics: 'NONE'
    };
    params['RequestItems'][HISTORY_TABLE] = items.map(i => {
        return {
            PutRequest: {
                Item: i
            }
        };
    });
    //console.log(params.RequestItems.ClingenTest2History[0].PutRequest.Item);
    await docClient.batchWrite(params).promise();
    console.log('History written successfully');
}

exports.handler = async (event, context) => {
    /*****************************************************************
     * Overall idea here is to gather history for the items from the
     * table. We could store the history in the ClinGenTest2 itself,
     * but given that we just don't know what the use case is yet,
     * and the fact that storing the history in the same table would
     * introduce a need to filter records here to avoid an infinite
     * loop, I'm taking the lazy way out.
     *
     * Also, I kind of feel ClinGenTest2 Partition key name should be
     * simply 'PK' and sort key 'SK' to give more flexibility, but
     * that's another topic.
     *
     */
    const modifiedDate = new Date(Date.now());
    let items = [];
    console.log(event, '1')
    for (const record of event.Records) {
        if (shouldRecordRecord(record)) {
            console.log(record, '2')
            // Yeah, this isn't JavaScripty, but it's clearer and with
            // the console.logs and such a map/filter/reduce thingy
            // would get ugly looking
            let item = getHistoryItem(record, modifiedDate, context);

            // The setMilliseconds hack is to disambiguate keys based on time, usually
            // this is in a testing scenario
            item && items.push(item) && modifiedDate.setMilliseconds(modifiedDate.getMilliseconds() + 1);
        }
        console.log(record.eventName);
        console.log('DynamoDB Record: %j', record.dynamodb);
    }
    items.length && await writeHistoryItems(items);
    return `Successfully processed ${event.Records.length} records.`;
};
