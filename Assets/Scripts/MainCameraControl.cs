using UnityEngine;
using System.Collections;

public class MainCameraControl : MonoBehaviour {

	public float dampTime = 0.15f;
	private Vector3 velocity = Vector3.zero;
	public Transform target;

	private Bounds levelBounds;
	public float boundsBuffer = 5f;

	private float cameraxBounds;
	private float camerayBounds;

	// Use this for initialization
	void Start () {
		levelBounds = GameObject.Find ("SkySceneControl").GetComponent<SkySceneControl> ().levelBounds;
		levelBounds.Expand (boundsBuffer);
		if (Camera.main.pixelHeight > Camera.main.pixelWidth) {
			Camera.main.orthographicSize = 15f;
			boundsBuffer = 5f;
			cameraxBounds = levelBounds.extents.x - Camera.main.aspect * Camera.main.orthographicSize;
			camerayBounds = levelBounds.extents.y - Camera.main.orthographicSize;
		} else {
			Camera.main.orthographicSize = 10f;
			boundsBuffer = 5f * 15f / 10f;
			cameraxBounds = levelBounds.extents.x - Camera.main.aspect * Camera.main.orthographicSize;
			camerayBounds = levelBounds.extents.y - Camera.main.orthographicSize;
		}
	}

	// Update is called once per frame
	void Update () 
	{
		if (target)
		{
			Vector3 point = GetComponent<Camera>().WorldToViewportPoint(target.position);
			Vector3 delta = target.position - GetComponent<Camera>().ViewportToWorldPoint(new Vector3(0.5f, 0.5f, point.z)); //(new Vector3(0.5, 0.5, point.z));
			Vector3 destination = transform.position + delta;

			float cameraX = Mathf.Clamp (destination.x, -cameraxBounds, cameraxBounds);
			float cameraY = Mathf.Clamp (destination.y, -camerayBounds, camerayBounds);
			destination = new Vector3 (cameraX, cameraY, destination.z);
				
			transform.position = Vector3.SmoothDamp(transform.position, destination, ref velocity, dampTime);

		}

	}
}
