using UnityEngine;
using System.Collections;

public class PlaneControlScript : MonoBehaviour {

	public float speed = 8.0f;
	public float rotationSpeed = 400.0f;

	public GameObject exhaustDash;
	public GameObject balloonPopParticle;

	private Rigidbody2D rb2d;
	private Bounds levelBounds;

	// Use this for initialization
	void Start () {
		InvokeRepeating ("spawnExhaust", 0f, 0.25f);
		levelBounds = GameObject.Find ("SkySceneControl").GetComponent<SkySceneControl> ().levelBounds;
	}
	
	// Update is called once per frame
	void Update () {

		if (Input.GetKey("left") || Input.GetKey("a")) {
			transform.Rotate (0, 0, rotationSpeed * Time.deltaTime);
		}

		if (Input.GetKey("right") || Input.GetKey("d")) {
			transform.Rotate (0, 0, -rotationSpeed * Time.deltaTime);
			//gameObject.GetComponent<Rigidbody2D> ().angularVelocity = Random.Range (100f, 400f) * Mathf.Sign( (float)Random.Range (-1, 1));
		}

		if (Input.GetMouseButton (0)) {
			if (Input.mousePosition.x < Screen.width / 2f) {
				transform.Rotate (0, 0, rotationSpeed * Time.deltaTime);
			} 
			if (Input.mousePosition.x >= Screen.width / 2f) {
				transform.Rotate (0, 0, -rotationSpeed * Time.deltaTime);
			}
		}

		transform.position += transform.up * Time.deltaTime * speed;
		if (!levelBounds.Contains (transform.position)) {
			transform.position = levelBounds.ClosestPoint (transform.position);
		}

		if (1f < transform.eulerAngles.z && transform.eulerAngles.z < 181f) {
			gameObject.GetComponent<SpriteRenderer> ().flipX = true;
		} else {
			gameObject.GetComponent<SpriteRenderer> ().flipX = false;
		}
	}

	void spawnExhaust(){
		Instantiate (exhaustDash, transform.position, transform.rotation);
	}
		
}
