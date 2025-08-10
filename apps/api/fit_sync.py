import os
import pandas as pd
from datetime import datetime, timedelta, timezone
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

# If you change these scopes, delete token.json so you re-authorize.
SCOPES = [
    'https://www.googleapis.com/auth/fitness.sleep.read',
    'https://www.googleapis.com/auth/fitness.heart_rate.read'
]

def get_credentials():
    creds = None
    # 1) Load cached credentials
    if os.path.exists('../../token.json'):
        creds = Credentials.from_authorized_user_file('../../token.json', SCOPES)
    # 2) If no valid creds, go through OAuth flow (or refresh)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file('../../credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        # 3) Cache the new credentials
        with open('../../token.json', 'w') as token:
            token.write(creds.to_json())
    return creds

def main():
    os.makedirs('../data', exist_ok=True)
    creds   = get_credentials()
    service = build('fitness', 'v1', credentials=creds)

    # ——————————————————————————————
    # 1) Pull yesterday’s sleep sessions
    now       = datetime.now(timezone.utc)
    yesterday = now - timedelta(days=1)
    start_ts  = yesterday.isoformat()
    end_ts    = now.isoformat()

    sess_resp = service.users().sessions().list(
        userId='me',
        activityType=72,            # 72 = SLEEP
        startTime=start_ts,
        endTime=end_ts
    ).execute()

    sessions = sess_resp.get('session', [])
    df_sess = pd.json_normalize(sessions)
    df_sess['start_time'] = pd.to_datetime(
        df_sess['startTimeMillis'].astype(int),
        unit='ms', utc=True
    )
    df_sess['end_time']   = pd.to_datetime(
        df_sess['endTimeMillis'].astype(int),
        unit='ms', utc=True
    )

    print("=== Sleep Sessions ===")
    print(df_sess[['id','name','start_time','end_time']])

    # Optional: save to CSV
    df_sess.to_csv('data/sleep_sessions.csv', index=False)

    # ——————————————————————————————
    # 2) Fetch detailed sleep-stage segments
    if not df_sess.empty:
        sources = service.users().dataSources().list(userId='me').execute().get('dataSource', [])
        sleep_src = next(ds for ds in sources
                         if ds['dataType']['name']=='com.google.sleep.segment')

        # Build dataset ID (ns window)
        start_ns = int(df_sess.loc[0,'startTimeMillis']) * 1_000_000
        end_ns   = int(df_sess.loc[0,'endTimeMillis'])   * 1_000_000
        dataset_id = f"{start_ns}-{end_ns}"

        seg_resp = service.users().dataSources().datasets().get(
            userId='me',
            dataSourceId=sleep_src['dataStreamId'],
            datasetId=dataset_id
        ).execute()

        pts = seg_resp.get('point', [])
        df_pts = pd.json_normalize(pts)
        df_pts['start'] = pd.to_datetime(
            df_pts['startTimeNanos'].astype(int),
            unit='ns', utc=True
        )
        df_pts['end']   = pd.to_datetime(
            df_pts['endTimeNanos'].astype(int),
            unit='ns', utc=True
        )
        stage_map = {
            1: 'Awake (in bed)',
            2: 'Sleep',
            3: 'Out-of-bed',
            4: 'Light sleep',
            5: 'Deep sleep',
            6: 'REM sleep'
        }

        # …after loading df_pts…
        df_pts['stage'] = df_pts['value'].apply(
            lambda v: stage_map.get(v[0]['intVal'], f"Unknown({v[0]['intVal']})")
        )

        print("\n=== Sleep Segments ===")
        print(df_pts[['start','end','stage']])

        # Optional: save to CSV
        df_pts.to_csv('data/sleep_segments.csv', index=False)

    else:
        print("No sleep sessions found for yesterday.")

if __name__ == '__main__':
    main()
