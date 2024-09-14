import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { GPXFile } from "./gpx";
export function parseGPX(gpxData) {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "",
        attributesGroupName: 'attributes',
        isArray(name) {
            return name === 'trk' || name === 'trkseg' || name === 'trkpt' || name === 'wpt' || name === 'rte' || name === 'rtept' || name === 'gpxx:rpt';
        },
        attributeValueProcessor(attrName, attrValue, jPath) {
            if (attrName === 'lat' || attrName === 'lon') {
                return parseFloat(attrValue);
            }
            return attrValue;
        },
        transformTagName(tagName) {
            if (tagName === 'power') {
                // Transform the simple <power> tag to the more complex <gpxpx:PowerExtension> tag, the nested <gpxpx:PowerInWatts> tag is then handled by the tagValueProcessor
                return 'gpxpx:PowerExtension';
            }
            return tagName;
        },
        parseTagValue: false,
        tagValueProcessor(tagName, tagValue, jPath, hasAttributes, isLeafNode) {
            if (isLeafNode) {
                if (tagName === 'ele') {
                    return parseFloat(tagValue);
                }
                if (tagName === 'time') {
                    return new Date(tagValue);
                }
                if (tagName === 'gpxtpx:hr' || tagName === 'gpxtpx:cad' || tagName === 'gpxtpx:atemp' || tagName === 'gpxpx:PowerInWatts' || tagName === 'opacity' || tagName === 'weight') {
                    return parseFloat(tagValue);
                }
                if (tagName === 'gpxpx:PowerExtension') {
                    // Finish the transformation of the simple <power> tag to the more complex <gpxpx:PowerExtension> tag
                    // Note that this only targets the transformed <power> tag, since it must be a leaf node
                    return {
                        'gpxpx:PowerInWatts': parseFloat(tagValue)
                    };
                }
            }
            return tagValue;
        },
    });
    const parsed = parser.parse(gpxData).gpx;
    // @ts-ignore
    if (parsed.metadata === "") {
        parsed.metadata = {};
    }
    return new GPXFile(parsed);
}
export function buildGPX(file, exclude) {
    const gpx = file.toGPXFileType(exclude);
    const builder = new XMLBuilder({
        format: true,
        ignoreAttributes: false,
        attributeNamePrefix: "",
        attributesGroupName: 'attributes',
        suppressEmptyNode: true,
        tagValueProcessor: (tagName, tagValue) => {
            if (tagValue instanceof Date) {
                return tagValue.toISOString();
            }
            return tagValue.toString();
        },
    });
    gpx.attributes.creator = gpx.attributes.creator ?? 'https://gpx.studio';
    gpx.attributes['version'] = '1.1';
    gpx.attributes['xmlns'] = 'http://www.topografix.com/GPX/1/1';
    gpx.attributes['xmlns:xsi'] = 'http://www.w3.org/2001/XMLSchema-instance';
    gpx.attributes['xsi:schemaLocation'] = 'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/GpxExtensions/v3 http://www.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd http://www.garmin.com/xmlschemas/PowerExtension/v1 http://www.garmin.com/xmlschemas/PowerExtensionv1.xsd http://www.topografix.com/GPX/gpx_style/0/2 http://www.topografix.com/GPX/gpx_style/0/2/gpx_style.xsd';
    gpx.attributes['xmlns:gpxtpx'] = 'http://www.garmin.com/xmlschemas/TrackPointExtension/v1';
    gpx.attributes['xmlns:gpxx'] = 'http://www.garmin.com/xmlschemas/GpxExtensions/v3';
    gpx.attributes['xmlns:gpxpx'] = 'http://www.garmin.com/xmlschemas/PowerExtension/v1';
    gpx.attributes['xmlns:gpx_style'] = 'http://www.topografix.com/GPX/gpx_style/0/2';
    gpx.metadata.author = {
        name: 'gpx.studio',
        link: {
            attributes: {
                href: 'https://gpx.studio',
            }
        }
    };
    if (gpx.trk.length === 1 && (gpx.trk[0].name === undefined || gpx.trk[0].name === '')) {
        gpx.trk[0].name = gpx.metadata.name;
    }
    return builder.build({
        "?xml": {
            attributes: {
                version: "1.0",
                encoding: "UTF-8",
            }
        },
        gpx
    });
}
