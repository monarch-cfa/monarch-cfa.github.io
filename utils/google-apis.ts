import { Folder, File, Paged } from "../types";

const DISCOVERY_DOCS = [
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
];
const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

function isFolder(b) {
  const op = b ? "=" : "!=";
  const combiner = b ? "or" : "and";

  return (
    `(mimeType ${op} 'application/vnd.google-apps.folder' ${combiner}` +
    ` mimeType ${op} 'application/vnd.google-apps.shortcut')`
  );
}

const FileProps = [
  "id",
  "name",
  "description",
  "iconLink",
  "thumbnailLink",
  "contentHints",
  "webViewLink",
  "exportLinks",
  "webContentLink",
  "fullFileExtension",
  "parents",
  "properties",
  "mimeType",
].join(", ");

export async function initGoogleClient() {
  await new Promise((resolve) => window.gapi.load("client:auth2", resolve));
  await window.gapi.client.init({
    apiKey: process.env.API_KEY,
    clientId: process.env.CLIENT_ID,
    discoveryDocs: DISCOVERY_DOCS,
    scope: SCOPES,
  });
}

export function isSignedIn() {
  return window.gapi.auth2.getAuthInstance().isSignedIn.get();
}

export function getUser() {
  const gUser = window.gapi.auth2
    .getAuthInstance()
    .currentUser.get()
    .getBasicProfile();
  return {
    name: gUser.getName(),
    imageUrl: gUser.getImageUrl(),
  };
}

export async function signIn() {
  await window.gapi.auth2.getAuthInstance().signIn();
}

export function setOnAuthStatusChange(handler) {
  window.gapi.auth2.getAuthInstance().isSignedIn.listen(handler);
}

function getId(file) {
  return file.shortcutDetails?.targetId ?? file.id;
}

export async function getRootFolders(): Promise<Folder[]> {
  const pagesResponse = await window.gapi.client.drive.files.list({
    pageSize: 1000,
    q: `${isFolder(true)} and '${process.env.FOLDER_ID}' in parents`,
    fields: "files(id, name, shortcutDetails)",
  });

  return pagesResponse.result.files;
}

export async function getFolders(page: Folder): Promise<Folder[]> {
  const response = await window.gapi.client.drive.files.list({
    pageSize: 1000,
    q: `${isFolder(true)} and '${getId(page)}' in parents`,
    fields: `files(id, name, shortcutDetails)`,
  });

  return response.result.files;
}

export async function getFiles(
  folder: Folder,
  pageToken?: string
): Promise<[Paged<File>, Paged<Folder>]> {
  const folderId = getId(folder);

  const files = await gapi.client.drive.files.list({
    pageToken,
    pageSize: 10,
    q: `${isFolder(false)} and '${folderId}' in parents and trashed = false`,
    spaces: "drive",
    fields: `nextPageToken, files(${FileProps})`,
  });

  const folders = await gapi.client.drive.files.list({
    pageToken,
    q: `${isFolder} and '${folder}' in parents`,
    spaces: "drive",
    fields: `nextPageToken, files(id)`,
  });

  return [files.result, folders.result];
}