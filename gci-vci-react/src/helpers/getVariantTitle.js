import { API } from 'aws-amplify';
import { API_NAME } from '../utils';

//Return Variant preferredTitle Value
export async function getVariantTitle(PK) {
    const url = '/variants/' + PK;
    const data = await API.get(API_NAME, url)
    if (data.preferredTitle){
        return data.preferredTitle;
    }
    return "--";
}