import { execSync } from 'child_process';

async function main() {
  const token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
  const siteId = 'atelier-edit';

  const headers = {
    Authorization: `Bearer ${token}`,
    'x-goog-user-project': 'atelier-edit',
    'Content-Type': 'application/json',
  };

  console.log('1. Creating new Firebase Hosting version...');
  const createVersionRes = await fetch(
    `https://firebasehosting.googleapis.com/v1beta1/sites/${siteId}/versions`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        config: {
          rewrites: [
            {
              glob: '**',
              run: {
                serviceId: 'atelier-edit',
                region: 'europe-west2',
              },
            },
          ],
        },
      }),
    }
  );
  const versionData = await createVersionRes.json();
  console.log('Version created:', versionData.name);
  const versionName = versionData.name;

  console.log('2. Finalizing version to FINALIZED status...');
  const patchRes = await fetch(
    `https://firebasehosting.googleapis.com/v1beta1/${versionName}?update_mask=status`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        status: 'FINALIZED',
      }),
    }
  );
  const patchData = await patchRes.json();
  console.log('Version status:', patchData.status);

  console.log('3. Creating release pointing to new finalized version...');
  const releaseRes = await fetch(
    `https://firebasehosting.googleapis.com/v1beta1/sites/${siteId}/releases?versionName=${versionName}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: `Deployment with Guides Center (commit d8c3abc)`,
      }),
    }
  );
  const releaseData = await releaseRes.json();
  console.log('Release created successfully:', releaseData.name);
  console.log('Firebase Hosting CDN cache purged and release live!');
}

main().catch(err => {
  console.error('Error deploying Firebase release:', err);
  process.exit(1);
});
