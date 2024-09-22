# StreetLens

StreetLens is a web app that's more or less like a self-hosted Mapillary or Street View. It indexes and extracts key frames from 360 videos and displays them on a map for you to browse.

## Motivation

I created this project since I record with a GoPro Max every time I ride my bike and archive the footage to my NAS. The footage is very useful as street-level imagery when making OpenStreetMap edits, but it was very difficult to browse through the footage and find the right clip for the location I'm editing. I also did not want to blanket upload the footage to Mapillary since the quality of the footage varies and I didn't want to accidentally dox myself.

Thus, StreetLens was born!

## Limitations

StreetLens only works with GoPro Max `.360` video files at the moment. It cannot import videos from other 360 cameras, nor can it import sequences of images. I plan on refactoring the code to make it easier for the community to contribute support for other formats.

## Features

### Track Import

StreetLens can watch a directory for new videos and automatically import them as GPS tracks with `gopro2gpx`. Once imported, you can view the track on the map along with all the others. You can filter the tracks by the date they were captured so you can easily find the most recent imagery for an area. You can also download the generated GPX file to use in other applications, for example as an overlay in JOSM.

![](screenshots/track-import.png)

### Image Extraction

Once the track has been imported, StreetLens will extract key frames from the video using a modified version of `mapillary_tools` and display them when you view a track's details. You can view the images with the embedded panorama viewer or download them to your computer.

![](screenshots/image-import.png)